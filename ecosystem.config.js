module.exports = {
  apps: [
    {
      name: 'cm-api',
      script: 'dist/main.js',
      cwd: './backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 4001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      time: true,
      max_memory_restart: '500M',
      watch: false,
    },
    {
      name: 'cm-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 4000',
      cwd: './frontend',
      instances: 1,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      merge_logs: true,
      time: true,
      max_memory_restart: '500M',
      watch: false,
    },
  ],
};
