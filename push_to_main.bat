@echo off
echo ============================================
echo      Pushing All Updates to Main Branch
echo ============================================
git add .
git commit -m "feat: complete lecturer gradebook redesign, UI enhancements, English translations & global pointer cursor"
git push origin main
echo.
echo SUCCESS: All changes have been pushed to main!
pause
