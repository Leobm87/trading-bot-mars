const { formatFromFAQ } = require('../../services/common/format.cjs');

describe('Short Answer Tests', () => {
  test('should return short answer when available and RESPONSE_STYLE=short', async () => {
    process.env.RESPONSE_STYLE = 'short';
    
    const faq = {
      id: 'test-id',
      answer_md: 'This is a long answer with lots of details...',
      answer_short_md: '- Point 1\n- Point 2\n- Point 3'
    };
    
    const result = await formatFromFAQ(faq);
    
    expect(result.text).toBe('- Point 1\n- Point 2\n- Point 3');
    expect(result.faq_id).toBe('test-id');
  });

  test('should fallback to full answer when short not available', async () => {
    process.env.RESPONSE_STYLE = 'short';
    
    const faq = {
      id: 'test-id',
      answer_md: 'This is the full answer',
      answer_short_md: null
    };
    
    const result = await formatFromFAQ(faq);
    
    expect(result.text).toBe('This is the full answer');
  });

  test('should use full answer when forceFull option is set', async () => {
    process.env.RESPONSE_STYLE = 'short';
    
    const faq = {
      id: 'test-id',
      answer_md: 'This is the full answer',
      answer_short_md: '- Short point'
    };
    
    const result = await formatFromFAQ(faq, { forceFull: true });
    
    expect(result.text).toBe('This is the full answer');
  });

  test('short answers should be concise markdown bullets', () => {
    const shortAnswer = "- Punto 1\n- Punto 2\n- Punto 3";
    
    expect(/^[-*]/m.test(shortAnswer)).toBe(true);
    expect(shortAnswer.length).toBeLessThanOrEqual(600);
  });
});