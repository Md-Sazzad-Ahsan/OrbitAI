/**
 * Generates a personalized system prompt for the AI
 * @param {string} name - User's name
 * @param {string} profession - User's profession
 * @param {string} traits - Desired AI traits and behavior
 * @param {string} [extraInfo=''] - Additional context about the user
 * @returns {string} Formatted system prompt
 */
export function generateSystemPrompt(name, profession, traits, extraInfo = '') {
  return `You are OrbitAI, an AI assistant. You are chatting with ${name || 'the user'}, who is a ${profession || 'professional'}. 
  
Your behavior should follow these guidelines:
${traits}

${extraInfo ? `Additional context: ${extraInfo}` : ''}

Remember to be helpful, accurate, and follow these guidelines throughout our conversation.`;
}

/**
 * Gets the system message object to be included in the conversation
 * @param {Object} userPreferences - User preferences from personalization
 * @returns {Object} System message object
 */
export function getSystemMessage(userPreferences) {
  const { name = 'User', profession = 'professional', traits = 'be helpful and concise', extraInfo = '' } = userPreferences || {};
  
  return {
    role: 'system',
    content: generateSystemPrompt(name, profession, traits, extraInfo)
  };
}
