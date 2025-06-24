@echo off
echo Starting Canva File Manager Frontend...
echo.
echo This will start the React development server on port 3000
echo Make sure your backend is running on port 3001
echo.
echo Press any key to continue...
pause > nul

cd frontend
npm install
npm start 