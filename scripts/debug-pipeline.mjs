// debug-pipeline.cjs - Debug completo del pipeline para una query específica
import ApexService from '../services/firms/apex/index.js';

(async () => {
  const query = 'cuanto cobrar primer payout';
  
  console.log(`=== DEBUGGING PIPELINE: "${query}" ===\n`);
  
  try {
    const service = new ApexService();
    await service.initialize();
    
    const result = await service.processQuery(query);
    
    console.log('=== RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Pipeline error:', error);
  }
})();