/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback } from 'react';
import { generateStyledImage } from '../services/geminiService';
import Spinner from './Spinner';
import { UploadIcon } from './icons';

const QuickEditPanel: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const handleFileSelect = useCallback((file: File | null) => {
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file.');
                return;
            }
            setError(null);
            setResultImageUrl(null);
            setImageFile(file);
            const url = URL.createObjectURL(file);
            setImageUrl(url);

            // Clean up the object URL when the component unmounts or the image changes
            return () => URL.revokeObjectURL(url);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(e.target.files?.[0] ?? null);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(false);
        handleFileSelect(e.dataTransfer.files?.[0] ?? null);
    };

    const handleGenerate = async () => {
        if (!imageFile || !prompt.trim()) {
            setError('Please provide an image and a prompt.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResultImageUrl(null);

        try {
            const styledImageUrl = await generateStyledImage(imageFile, prompt);
            setResultImageUrl(styledImageUrl);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate the image. ${errorMessage}`);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full bg-black/20 p-8 rounded-2xl border border-gray-700/50 mt-16 flex flex-col items-center">
            <h2 className="text-3xl font-bold text-gray-100 mb-2">Try a Quick Edit</h2>
            <p className="text-gray-400 mb-6">Drop an image, describe a style, and see the magic happen instantly.</p>
            
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Input Side */}
                <div className="flex flex-col gap-4">
                    <div 
                        className={`relative w-full aspect-video rounded-lg border-2 border-dashed transition-colors ${isDraggingOver ? 'border-gray-400 bg-gray-500/10' : 'border-gray-600'}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                        onDragLeave={() => setIsDraggingOver(false)}
                        onDrop={handleDrop}
                    >
                        {imageUrl ? (
                             <img src={imageUrl} alt="Uploaded preview" className="w-full h-full object-contain rounded-lg" />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4">
                                <UploadIcon className="w-8 h-8 mb-2" />
                                <span className="font-semibold">Drag & drop an image here</span>
                                <span className="text-sm">or</span>
                                <label htmlFor="quick-edit-upload" className="text-white font-semibold cursor-pointer hover:underline">
                                    browse files
                                </label>
                            </div>
                        )}
                        <input id="quick-edit-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., 'make it a watercolor painting'"
                        className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-white focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
                        disabled={isLoading || !imageFile}
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !imageFile || !prompt.trim()}
                        className="w-full bg-white text-black font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-white/20 hover:shadow-xl hover:shadow-white/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:bg-gray-600 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isLoading ? 'Generating...' : 'Generate'}
                    </button>
                </div>

                {/* Output Side */}
                <div className="relative w-full aspect-video rounded-lg bg-black/30 border border-gray-700 flex items-center justify-center">
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 animate-fade-in">
                            <Spinner />
                            <p className="text-gray-300">AI is working its magic...</p>
                        </div>
                    )}
                    {resultImageUrl && !isLoading && (
                        <img src={resultImageUrl} alt="Generated image" className="w-full h-full object-contain rounded-lg animate-fade-in" />
                    )}
                    {!resultImageUrl && !isLoading && (
                        <div className="text-center text-gray-500 p-4">
                            <p>Your generated image will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
            {error && (
                <div className="mt-4 w-full bg-red-900/50 border border-red-700 text-red-200 p-3 rounded-lg text-center animate-fade-in">
                    {error}
                </div>
            )}
        </div>
    );
};

export default QuickEditPanel;
