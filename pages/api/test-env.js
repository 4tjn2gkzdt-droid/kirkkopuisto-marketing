// Testi-endpoint ympäristömuuttujien tarkistamiseen
import cors from '../../lib/cors'

async function handler(req, res) {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'SET' : 'MISSING',
    RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
  };

  // Näytä myös ensimmäiset merkit vahvistukseksi
  const details = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || 'MISSING',
    serviceKeyStart: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) || 'MISSING',
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
  };

  res.status(200).json({
    envVars,
    details,
    message: 'Environment variables check'
  });
}

export default cors(handler)
