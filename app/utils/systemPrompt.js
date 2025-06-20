/**
 * Generates a personalized system prompt for the AI
 * @param {string} name - User's name
 * @param {string} profession - User's profession
 * @param {string} traits - Desired AI traits and behavior
 * @param {string} [extraInfo=''] - Additional context about the user
 * @returns {string} Formatted system prompt
 */
export function generateSystemPrompt(name, profession, traits, additionalInfo = '') {
  let prompt = `You are OrbitAI, an AI assistant. You are chatting with ${name || 'the user'}, who is a ${profession || 'professional'}. 
  
Your behavior should follow these guidelines:
${traits}`;

  if (additionalInfo) {
    prompt += `

Additional context about the user that you should consider:
${additionalInfo}`;
  }

  prompt += `

Remember to be helpful, accurate, and follow these guidelines throughout our conversation.`;
  return prompt;
}

/**
 * Saves user personalization data to localStorage
 * @param {Object} userData - User personalization data
 * @returns {boolean} True if saved successfully
 */
export function savePersonalizationToLocalStorage(userData) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('orbitAI_personalization', JSON.stringify(userData));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error saving personalization to localStorage:', error);
    return false;
  }
}

/**
 * Gets the system message object to be included in the conversation
 * @param {Object} userPreferences - User preferences from personalization
 * @returns {Object} System message object
 */
export function getSystemMessage(userPreferences) {
  // Try to get from localStorage if no preferences provided
  if (!userPreferences && typeof window !== 'undefined') {
    const savedData = localStorage.getItem('orbitAI_personalization');
    if (savedData) {
      try {
        userPreferences = JSON.parse(savedData);
      } catch (e) {
        console.error('Error parsing saved personalization:', e);
      }
    }
  }

  const { name = 'User', profession = 'professional', traits = 'be helpful and concise', extraInfo = '' } = userPreferences || {};
  
  return {
    role: 'system',
    content: generateSystemPrompt(name, profession, traits, extraInfo)
  };
}
