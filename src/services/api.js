import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const register = async (email) => {
  try {
    console.log('Attempting registration for:', email);
    console.log('API Base URL:', API_BASE_URL);
    
  const response = await api.post('/api/auth/register', { email });
    console.log('Registration successful:', response.data);
  return response.data;
  } catch (error) {
    console.error('Registration Error Details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL
      }
    });
    throw error;
  }
};

export const verifyOTP = async (email, otp) => {
  const response = await api.post('/api/auth/verify-otp', { email, otp });
  return response.data;
};

export const setupPassword = async (email, otp, password) => {
  const response = await api.post('/api/auth/setup-password', { email, otp, password });
  return response.data;
};

export const login = async (email, password) => {
  try {
    console.log('Attempting login for:', email);
    console.log('API Base URL:', API_BASE_URL);
    
  const response = await api.post('/api/auth/login', { email, password });
    console.log('Login successful:', response.data);
  return response.data;
  } catch (error) {
    console.error('Login Error Details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL
      }
    });
    throw error;
  }
};

export const resendOTP = async (email) => {
  const response = await api.post('/api/auth/resend-otp', { email });
  return response.data;
};

export const sendMessage = async (prompt) => {
  try {
    const response = await api.post('/api/chat', { prompt });
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Upload and parse resume PDF
 * @param {FormData} formData - FormData containing the PDF file
 * @returns {Promise<Object>} Parsed resume text
 */
export const uploadResume = async (formData) => {
  try {
    console.log('Uploading resume...');
    
    // Log the contents of FormData
    for (let [key, value] of formData.entries()) {
      console.log(`FormData entry - Key: ${key}, Value:`, value);
    }

    // Use the configured API base URL instead of relative URL
    const response = await fetch(`${API_BASE_URL}/api/resume/parse`, {
      method: 'POST',
      body: formData,
    });

    // Log the full response details
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Get response text for debugging
    const responseText = await response.text();
    console.log('Raw Response Text:', responseText);

    // Try to parse the response body
    let responseData;
    const contentType = response.headers.get('content-type');
    
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
      console.log('Parsed response:', responseData);
    } catch (parseError) {
      console.error('JSON Parsing Error:', parseError);
      console.log('Unparseable response text:', responseText);
      throw new Error(`Unexpected response format: ${responseText}`);
    }

    // Check for error in the response
    if (!response.ok) {
      throw new Error(
        responseData?.message || 
        responseData?.error || 
        'Failed to upload resume. Please try again.'
      );
    }

    // Validate response data
    if (!responseData) {
      throw new Error('No data received from server');
    }

    return responseData;
  } catch (error) {
    console.error('Resume Upload Full Error:', error);
    
    // More detailed error logging
    if (error instanceof TypeError) {
      console.error('Network Error:', error.message);
    }
    
    throw error;
  }
};

/**
 * Upload and analyze resume PDF with AI
 * Extracts structured information (work experience, education, skills)
 * @param {FormData} formData - FormData containing the PDF file
 * @returns {Promise<Object>} Structured resume analysis
 */
export const analyzeResume = async (formData) => {
  try {
    console.log('Analyzing resume with AI...');
    
    // Log the contents of FormData
    for (let [key, value] of formData.entries()) {
      console.log(`FormData entry - Key: ${key}, Value:`, value);
    }

    // Use the configured API base URL instead of relative URL
    const response = await fetch(`${API_BASE_URL}/api/resume/analyze`, {
      method: 'POST',
      body: formData,
    });

    // Log the full response details
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Get response text for debugging
    const responseText = await response.text();
    console.log('Raw Response Text:', responseText);

    // Try to parse the response body
    let responseData;
    
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
      console.log('Parsed analysis response:', responseData);
    } catch (parseError) {
      console.error('JSON Parsing Error:', parseError);
      console.log('Unparseable response text:', responseText);
      throw new Error(`Unexpected response format: ${responseText}`);
    }

    // Check for error in the response
    if (!response.ok) {
      throw new Error(
        responseData?.message || 
        responseData?.error || 
        'Failed to analyze resume. Please try again.'
      );
    }

    // Validate response data
    if (!responseData) {
      throw new Error('No data received from server');
    }

    return responseData;
  } catch (error) {
    console.error('Resume Analysis Full Error:', error);
    
    // More detailed error logging
    if (error instanceof TypeError) {
      console.error('Network Error:', error.message);
    }
    
    throw error;
  }
};

export const forgotPassword = async (email) => {
  const response = await api.post('/api/auth/forgot-password', { email });
  return response.data;
};

export const verifyResetOTP = async (email, otp) => {
  const response = await api.post('/api/auth/verify-reset-otp', { email, otp });
  return response.data;
};

export const resetPassword = async (email, otp, password) => {
  const response = await api.post('/api/auth/reset-password', { email, otp, password });
  return response.data;
};

/**
 * Upload resume and job description, match skills using Gemini
 * @param {FormData} formData - FormData containing the PDF file and jobDescription
 * @returns {Promise<Object>} Skill match report
 */
export const matchResumeSkills = async (formData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/resume/match-skills`, {
      method: 'POST',
      body: formData,
    });
    const responseText = await response.text();
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      throw new Error(`Unexpected response format: ${responseText}`);
    }
    if (!response.ok) {
      throw new Error(
        responseData?.message || 
        responseData?.error || 
        'Failed to match skills. Please try again.'
      );
    }
    if (!responseData) {
      throw new Error('No data received from server');
    }
    return responseData;
  } catch (error) {
    throw error;
  }
};

/**
 * Generate a job description using Gemini based on experience, role, and company
 * @param {Object} params - { experience, role, company }
 * @returns {Promise<string>} Generated job description
 */
export const generateJobDescription = async ({ experience, role, company }) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/resume/generate-jd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experience, role, company }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to generate job description');
    }
    return data.jobDescription;
  } catch (error) {
    throw error;
  }
};
