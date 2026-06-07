@echo off
echo Pushing AI Tools Weekly to GitHub...
echo.
cd /d "%~dp0"

git init
git branch -M main
git config user.email "shomron.niv@gmail.com"
git config user.name "Niv Shomron"
git remote remove origin 2>nul
git remote add origin https://github.com/shomronniv/aitoolsweekly.git

git rm -r --cached . 2>nul
git add .
git commit -m "feat: full site with dark mode, recommender, stacks, ROI calculator, email automation"
git push -u origin main --force

echo.
echo Done! Check https://github.com/shomronniv/aitoolsweekly
pause
