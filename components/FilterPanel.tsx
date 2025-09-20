/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface StylePanelProps {
  onApplyStyle: (prompt: string) => void;
  isLoading: boolean;
}

const styles = [
  { 
    name: 'Van Gogh', 
    prompt: 'Reimagine this image in the style of Vincent van Gogh, with thick, swirling brushstrokes (impasto), vibrant and emotional use of color, and a sense of movement and energy.',
    gradient: 'from-blue-400 via-yellow-300 to-orange-500'
  },
  { 
    name: 'Monet', 
    prompt: 'Transform this image into an Impressionist painting in the style of Claude Monet, focusing on capturing the play of light with soft, visible brushstrokes and a bright, pastel color palette.',
    gradient: 'from-purple-300 via-blue-300 to-green-200'
  },
  { 
    name: 'Anime', 
    prompt: 'Give the image a vibrant Japanese anime style, with bold outlines, cel-shading, and saturated colors.',
    gradient: 'from-pink-400 via-purple-400 to-indigo-500'
  },
  { 
    name: 'Pop Art', 
    prompt: 'Convert this image into a Pop Art piece in the style of Andy Warhol, using high-contrast, bold, and unnatural colors, and a silkscreened look.',
    gradient: 'from-yellow-300 via-red-500 to-blue-500'
  },
];

const StylePanel: React.FC<StylePanelProps> = ({ onApplyStyle, isLoading }) => {
  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-gray-300">Apply an Artistic Style</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {styles.map(style => (
          <button
            key={style.name}
            onClick={() => onApplyStyle(style.prompt)}
            disabled={isLoading}
            className="group aspect-w-1 aspect-h-1 w-full bg-gray-900 rounded-lg flex flex-col justify-end p-4 text-left relative overflow-hidden border border-gray-700 hover:border-white/50 transition-all duration-300 ease-in-out transform hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <div className={`absolute inset-0 bg-gradient-to-tr ${style.gradient} opacity-60 group-hover:opacity-80 transition-opacity duration-300`}></div>
            <div className="absolute inset-0 bg-black/30"></div>
            <h4 className="relative text-white font-bold text-lg tracking-tight z-10">{style.name}</h4>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StylePanel;