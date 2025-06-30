'use client';

import { useState, useEffect } from 'react';

export default function DescribeImg({ file, onDescriptionReady, onError }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [description, setDescription] = useState('');

  useEffect(() => {
    const processImage = async () => {
      if (!file) return;
      
      setIsProcessing(true);
      
      try {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('/api/openrouter/gemma', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            
            const data = line.replace(/^data: /, '').trim();
            if (data === '[DONE]') break;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                result += content;
                setDescription(result);
                onDescriptionReady?.(result);
              }
            } catch (e) {
              console.error('Error parsing JSON chunk:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error processing image:', error);
        onError?.(error.message || 'Failed to process image');
      } finally {
        setIsProcessing(false);
      }
    };
    
    processImage();
  }, [file, onDescriptionReady, onError]);

  if (isProcessing) {
    return (
      <div className="flex items-center p-2 text-sm text-gray-500">
        <span className="animate-pulse">Analyzing image...</span>
      </div>
    );
  }

  if (description) {
    return (
      <div className="p-4 text-sm text-gray-700 dark:text-gray-300">
        <p className="font-medium">Image analysis complete</p>
      </div>
    );
  }

  return null;
}
