const { exec } = require('child_process');

module.exports = {

  crearBase: async function(nombreDB){

    return new Promise((resolve,reject)=>{

      const comando = `
      psql -U postgres -c "CREATE DATABASE ${nombreDB};"
      `;

      exec(comando,(err,stdout,stderr)=>{

        if(err){
          return reject(stderr || err.message);
        }

        resolve(stdout);

      });

    });

  }

};