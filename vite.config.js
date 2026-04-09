import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  server: {
    host: '0.0.0.0',  // Listen on all network interfaces
    port: 3000,       // Port number to use
    strictPort: false, // Automatically assign a free port if 3000 is busy
    
  },
  build: {
    outDir: 'dist'
  },
  plugins: [{
    name: 'generate-image-catalog',
    configureServer(server) {
      // API to save positions (put it at the top of middlewares)
      server.middlewares.use((req, res, next) => {
        if (req.url.startsWith('/api/save-positions') && req.method === 'POST') {
          console.log('[API] Saving positions...');
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const { folder, positions } = JSON.parse(body || '{}');
              if (!folder) throw new Error('ไม่พบข้อมูลชื่อโฟลเดอร์');
              
              const folderPath = path.resolve(process.cwd(), 'public/image', folder);
              if (fs.existsSync(folderPath)) {
                fs.writeFileSync(
                  path.join(folderPath, 'positions.json'),
                  JSON.stringify(positions, null, 2)
                );
                
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, message: 'บันทึกสำเร็จ' }));
                console.log(`[API] Saved positions for ${folder}`);
              } else {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'ไม่พบโฟลเดอร์ที่ระบุ' }));
              }
            } catch (err) {
              console.error('[API] Save Error:', err.message);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }
        next();
      });

      const scan = () => {

        const imageDir = path.resolve(process.cwd(), 'public/image');
        if (!fs.existsSync(imageDir)) return;

        const folders = fs.readdirSync(imageDir)
          .filter(f => fs.statSync(path.join(imageDir, f)).isDirectory())
          .filter(f => f.match(/^\d{6}$/))
          .sort();
        
        fs.writeFileSync(
          path.resolve(process.cwd(), 'public/image-catalog.json'),
          JSON.stringify({ folders }, null, 2)
        );
        console.log('[Watcher] Updated image-catalog.json');

        folders.forEach(folder => {
          const folderPath = path.join(imageDir, folder);
          const files = fs.readdirSync(folderPath)
            .filter(f => f.match(/\.(jpg|jpeg|png)$/i))
            .sort((a, b) => {
              const aNum = parseInt(a.match(/\d+/));
              const bNum = parseInt(b.match(/\d+/));
              if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
              return a.localeCompare(b);
            });
          
          fs.writeFileSync(
            path.resolve(folderPath, 'image-list.json'),
            JSON.stringify(files, null, 2)
          );
        });
      };

      // Initial scan
      scan();

      // Watch for changes in public/image
      const imageDir = path.resolve(process.cwd(), 'public/image');
      fs.watch(imageDir, { recursive: true }, (eventType, filename) => {
        if (filename && (filename.endsWith('.json') || filename.includes('image-list.json'))) return;
        console.log(`[Watcher] Change detected: ${filename} (${eventType})`);
        scan();
      });
    },
    buildStart() {
      // Also run during build
      const imageDir = path.resolve(process.cwd(), 'public/image');
      if (!fs.existsSync(imageDir)) return;

      const folders = fs.readdirSync(imageDir)
        .filter(f => fs.statSync(path.join(imageDir, f)).isDirectory())
        .filter(f => f.match(/^\d{6}$/))
        .sort();
      
      fs.writeFileSync(
        path.resolve(process.cwd(), 'public/image-catalog.json'),
        JSON.stringify({ folders }, null, 2)
      );

      folders.forEach(folder => {
        const folderPath = path.join(imageDir, folder);
        const files = fs.readdirSync(folderPath)
          .filter(f => f.match(/\.(jpg|jpeg|png)$/i))
          .sort((a, b) => {
            const aNum = parseInt(a.match(/\d+/));
            const bNum = parseInt(b.match(/\d+/));
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            return a.localeCompare(b);
          });
        
        fs.writeFileSync(
          path.resolve(folderPath, 'image-list.json'),
          JSON.stringify(files, null, 2)
        );
      });
    }
  }]
});
