module.exports = {
  apps: [
    {
      name: 'mcms-backend',
      script: 'src/server.js',
      cwd: './backend',
      instances: 'max',       // Utilize all 4 vCPUs on the server
      exec_mode: 'cluster',   // Load balance traffic across cores
      watch: false,           // Do not watch files in production
      max_memory_restart: '1G', // Restart process if memory exceeds 1GB
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      combine_logs: true,
      merge_logs: true
    }
  ]
};
