/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateStyledImage, generateAdjustedImage, generateInpaintedImage, fileToPart, getDrawingAnalysis, type Content } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import StylePanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import AnalyzePanel from './components/AnalyzePanel';
import MagicFillPanel from './components/MagicFillPanel';
import MaskingCanvas from './components/MaskingCanvas';
import { UndoIcon, RedoIcon, EyeIcon, BrushIcon } from './components/icons';
import StartScreen from './components/StartScreen';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

type Tab = 'retouch' | 'magic-fill' | 'adjust' | 'styles' | 'crop' | 'analyze';

const App: React.FC = () => {
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  const [chatHistory, setChatHistory] = useState<Content[]>([]);
  const [hasInitialAnalysisRun, setHasInitialAnalysisRun] = useState<boolean>(false);
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Magic Fill state
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState<number>(40);
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number}>({width: 0, height: 0});
  const maskCanvasRef = useRef<{ clearMask: () => void }>(null);


  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  // Effect to create and revoke object URLs safely for the current image
  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  // Effect to create and revoke object URLs safely for the original image
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);

  // Effect to update image dimensions for masking canvas
  useEffect(() => {
    const updateDimensions = () => {
        if (imgRef.current) {
            const { clientWidth, clientHeight } = imgRef.current;
            if (imageDimensions.width !== clientWidth || imageDimensions.height !== clientHeight) {
                setImageDimensions({ width: clientWidth, height: clientHeight });
            }
        }
    };

    const imageEl = imgRef.current;
    if (imageEl) {
        // Run once on mount
        updateDimensions();
        // Add listener for resize events
        const resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(imageEl);
        return () => resizeObserver.unobserve(imageEl);
    }
}, [currentImageUrl, imageDimensions.width, imageDimensions.height]);


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    // Reset transient states after an action
    setCrop(undefined);
    setCompletedCrop(undefined);
    setMaskDataUrl(null);
    maskCanvasRef.current?.clearMask();
  }, [history, historyIndex]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveTab('retouch');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setChatHistory([]);
    setHasInitialAnalysisRun(false);
    setMaskDataUrl(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to edit.');
      return;
    }
    
    if (!prompt.trim()) {
        setError('Please enter a description for your edit.');
        return;
    }

    if (!editHotspot) {
        setError('Please click on the image to select an area to edit.');
        return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspot);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setEditHotspot(null);
        setDisplayHotspot(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, editHotspot, addImageToHistory]);
  
  const handleGenerateFill = useCallback(async (fillPrompt: string) => {
    if (!currentImage || !maskDataUrl) {
      setError('Please load an image and mask an area to fill.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const maskFile = dataURLtoFile(maskDataUrl, 'mask.png');
        const filledImageUrl = await generateInpaintedImage(currentImage, maskFile, fillPrompt);
        const newImageFile = dataURLtoFile(filledImageUrl, `filled-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the filled image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, maskDataUrl, addImageToHistory]);

  const handleApplyStyle = useCallback(async (stylePrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply a style to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const styledImageUrl = await generateStyledImage(currentImage, stylePrompt);
        const newImageFile = dataURLtoFile(styledImageUrl, `styled-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the style. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);
  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply an adjustment to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the adjustment. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
        setError('Please select an area to crop.');
        return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        setError('Could not process the crop.');
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);

  }, [completedCrop, addImageToHistory]);

  const handleSendMessage = async (message: string) => {
    if (!currentImage) {
        setError('Please upload an image to analyze.');
        return;
    }

    setIsLoading(true);
    setError(null);

    const userParts: Content['parts'] = [];
    // If this is the first message, add the image.
    if (chatHistory.length === 0) {
        try {
            const imagePart = await fileToPart(currentImage);
            userParts.push(imagePart);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Could not process image for analysis. ${errorMessage}`);
            setIsLoading(false);
            return;
        }
    }
    userParts.push({ text: message });

    const userContent: Content = { role: 'user', parts: userParts };
    const newHistory = [...chatHistory, userContent];
    setChatHistory(newHistory);

    try {
        const response = await getDrawingAnalysis(newHistory);

        if (response.promptFeedback?.blockReason) {
            throw new Error(`Request was blocked. Reason: ${response.promptFeedback.blockReason}.`);
        }

        const modelResponseText = response.text;
        if (!modelResponseText) {
            throw new Error('The AI model did not return a text response. This might be due to safety filters.');
        }

        const modelContent: Content = {
            role: 'model',
            parts: [{ text: modelResponseText }]
        };
        setChatHistory(prev => [...prev, modelContent]);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to get analysis. ${errorMessage}`);
        // On error, remove the user's last message from history to allow retry
        setChatHistory(prev => prev.slice(0, -1));
    } finally {
        setIsLoading(false);
    }
};

    // Effect to trigger initial analysis when switching to the 'analyze' tab
    useEffect(() => {
        const triggerInitialAnalysis = async () => {
            if (activeTab === 'analyze' && !isLoading && !hasInitialAnalysisRun && chatHistory.length === 0 && currentImage) {
                setHasInitialAnalysisRun(true);
                await handleSendMessage("Please provide a brief, high-level analysis of this artwork. Give me one key strength and one area for improvement.");
            }
        };
        triggerInitialAnalysis();
    }, [activeTab, currentImage, hasInitialAnalysisRun, isLoading, chatHistory.length]);


  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setMaskDataUrl(null);
    }
  }, [canUndo, historyIndex]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setMaskDataUrl(null);
    }
  }, [canRedo, historyIndex]);

  const handleReset = useCallback(() => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setError(null);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setChatHistory([]);
      setHasInitialAnalysisRun(false);
      setMaskDataUrl(null);
      maskCanvasRef.current?.clearMask();
    }
  }, [history]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      setPrompt('');
      setEditHotspot(null);
      setDisplayHotspot(null);
      setChatHistory([]);
      setMaskDataUrl(null);
  }, []);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `edited-${currentImage.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'retouch') return;
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDisplayHotspot({ x: offsetX, y: offsetY });

    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const scaleX = naturalWidth / clientWidth;
    const scaleY = naturalHeight / clientHeight;

    const originalX = Math.round(offsetX * scaleX);
    const originalY = Math.round(offsetY * scaleY);

    setEditHotspot({ x: originalX, y: originalY });
};

  const renderContent = () => {
    if (error) {
       return (
           <div className="text-center animate-fade-in bg-gray-700/50 border border-gray-600 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-200">An Error Occurred</h2>
            <p className="text-md text-gray-400">{error}</p>
            <button
                onClick={() => setError(null)}
                className="bg-gray-300 hover:bg-white text-black font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Try Again
            </button>
          </div>
        );
    }
    
    if (!currentImageUrl) {
      return <StartScreen onFileSelect={handleFileSelect} />;
    }

    const imageDisplay = (
      <div className="relative">
        {/* Base image is the original, always at the bottom */}
        {originalImageUrl && (
            <img
                key={originalImageUrl}
                src={originalImageUrl}
                alt="Original"
                className="w-full h-auto object-contain