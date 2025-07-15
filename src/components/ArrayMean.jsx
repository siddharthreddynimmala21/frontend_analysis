import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navigation from './common/Navigation';
import { calculateArrayMean } from '../services/api';
import toast from 'react-hot-toast';

export default function ArrayMean() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [numbers, setNumbers] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleNameChange = (event) => {
    setName(event.target.value);
  };

  const handleNumbersChange = (event) => {
    setNumbers(event.target.value);
  };

  const handleCalculate = async () => {
    // Basic validation
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    if (!numbers.trim()) {
      setError('Please enter numbers separated by commas');
      return;
    }

    // Validate that input contains only numbers and commas
    const numbersRegex = /^[\d,\s\.]+$/;
    if (!numbersRegex.test(numbers)) {
      setError('Please enter only numbers separated by commas');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await calculateArrayMean(name, numbers);
      
      // Log the response for debugging
      console.log('Array Mean Calculation Response:', response);
      
      // Set the result
      setResult(response);
      toast.success('Calculation completed successfully!');
    } catch (error) {
      console.error('Error calculating mean:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 
        'An unexpected error occurred while calculating the mean.';
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 to-black text-white p-4">
      <Navigation showBack={true} />
      
      <motion.div 
        className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto mt-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">Array Mean Calculator</h1>
        
        <motion.div 
          className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 md:p-8"
          variants={cardVariants}
        >
          <div className="mb-6 flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold">Calculate Mean of Array</h2>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
              {error}
            </div>
          )}
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" htmlFor="name">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              placeholder="Enter your name"
              value={name}
              onChange={handleNameChange}
              disabled={isLoading}
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" htmlFor="numbers">
              Numbers (comma separated)
            </label>
            <input
              id="numbers"
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              placeholder="e.g., 10,20,30,40,50"
              value={numbers}
              onChange={handleNumbersChange}
              disabled={isLoading}
            />
          </div>
          
          <button
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${isLoading ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700'}`}
            onClick={handleCalculate}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Calculating...
              </span>
            ) : 'Calculate Mean'}
          </button>
          
          {result && (
            <motion.div 
              className="mt-8 p-6 bg-white/5 border border-white/20 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-lg font-semibold mb-2">Result</h3>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-lg">{result.message}</p>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm text-gray-300">Input Values:</p>
                  <p className="text-sm">Name: <span className="text-blue-300">{result.input.name}</span></p>
                  <p className="text-sm">Numbers: <span className="text-blue-300">{result.input.numbers}</span></p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}