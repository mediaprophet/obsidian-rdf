@echo off
REM Clean script for semantic-weaver Obsidian plugin
REM Removes node_modules, dist/build artifacts, and lock files

REM Remove node_modules
if exist node_modules rmdir /s /q node_modules


REM Recursively remove all .js and .js.map files except in node_modules, js, and esbuild.config.js
for /r %%F in (*.js) do (
  echo %%F | findstr /i /c:"node_modules" >nul
  set NODE_MODULES=!errorlevel!
  echo %%F | findstr /i /c:"\js\" >nul
  set JSFOLDER=!errorlevel!
  echo %%F | findstr /i /c:"esbuild.config.js" >nul
  set ESBUILD=!errorlevel!
  if !NODE_MODULES! neq 0 if !JSFOLDER! neq 0 if !ESBUILD! neq 0 if not "%%~nxF"=="esbuild.config.js" del /q "%%F"
)
for /r %%F in (*.js.map) do (
  echo %%F | findstr /i /c:"node_modules" >nul
  set NODE_MODULES=!errorlevel!
  echo %%F | findstr /i /c:"\js\" >nul
  set JSFOLDER=!errorlevel!
  if !NODE_MODULES! neq 0 if !JSFOLDER! neq 0 del /q "%%F"
)

REM Remove other build artifacts
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build

REM Remove lock files
if exist package-lock.json del /q package-lock.json
if exist yarn.lock del /q yarn.lock

REM Remove .tsbuildinfo if present
if exist tsconfig.tsbuildinfo del /q tsconfig.tsbuildinfo

echo Clean complete.