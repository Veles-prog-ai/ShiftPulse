#!/usr/bin/env python3
"""
ShiftPulse Ledger - Standalone Distribution Package Generator
Kreira 3 odvojena instalaciona paketa:
1. Windows (zip arhiva sa .bat, .ps1, pre-built dist/ i server.js)
2. Linux (tar.gz arhiva sa .sh, .desktop datotekom, pre-built dist/)
3. ChromeOS (zip arhiva sa PWA manifestom, Crostini skriptom, pre-built dist/)
"""

import os
import sys
import tarfile
import zipfile
import subprocess

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PUBLIC_DOWNLOADS = os.path.join(ROOT_DIR, 'public', 'downloads')
PACKAGES_DIR = os.path.join(ROOT_DIR, 'packages')
DIST_DIR = os.path.join(ROOT_DIR, 'dist')

SERVER_MODULES_DIR = os.path.join(ROOT_DIR, 'server')
PLUGINS_DIR = os.path.join(ROOT_DIR, 'plugins')
COUNTRY_PACKS_DIR = os.path.join(ROOT_DIR, 'countryPacks')

os.makedirs(PUBLIC_DOWNLOADS, exist_ok=True)

# 1. Ensure dist/ is freshly built
print("[*] Building production bundle (npm run build)...")
subprocess.run(["npm", "run", "build"], cwd=ROOT_DIR, check=True)

COMMON_CORE_FILES = [
    'server.js',
    'legalMonitorEngine.js',
    'legal_monitor_state.example.json',
    'referrals_state.example.json',
    'TERMS_OF_SERVICE_USLOVI_KORISCENJA.md',
    'package.json',
    'main.js',
    'sys_metadata.json'
]

def add_dir_to_zip(zip_handle, dir_path, arc_prefix):
    if not os.path.exists(dir_path):
        return
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, dir_path)
            zip_handle.write(full_path, os.path.join(arc_prefix, rel_path))

def add_dir_to_tar(tar_handle, dir_path, arc_prefix):
    if not os.path.exists(dir_path):
        return
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, dir_path)
            tar_handle.add(full_path, arcname=os.path.join(arc_prefix, rel_path))

def build_windows_package():
    target_zip = os.path.join(PUBLIC_DOWNLOADS, 'shiftpulse-windows-package.zip')
    print(f"[*] Building Windows installer package: {target_zip}")
    with zipfile.ZipFile(target_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        win_dir = os.path.join(PACKAGES_DIR, 'windows')
        for item in os.listdir(win_dir):
            zf.write(os.path.join(win_dir, item), item)
        for cf in COMMON_CORE_FILES:
            full = os.path.join(ROOT_DIR, cf)
            if os.path.exists(full):
                zf.write(full, cf)
        for asset in ['icon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png', 'manifest.json', 'sw.js', 'install.html', 'landing.html', 'admin.html']:
            p = os.path.join(ROOT_DIR, 'public', asset)
            if os.path.exists(p):
                zf.write(p, f'public/{asset}')
        add_dir_to_zip(zf, SERVER_MODULES_DIR, 'server')
        add_dir_to_zip(zf, PLUGINS_DIR, 'plugins')
        add_dir_to_zip(zf, COUNTRY_PACKS_DIR, 'countryPacks')
        add_dir_to_zip(zf, DIST_DIR, 'dist')
    print(f"[OK] Windows package created ({os.path.getsize(target_zip)} bytes)")

def build_linux_package():
    target_tar = os.path.join(PUBLIC_DOWNLOADS, 'shiftpulse-linux-package.tar.gz')
    print(f"[*] Building Linux installer package: {target_tar}")
    with tarfile.open(target_tar, 'w:gz') as tf:
        linux_dir = os.path.join(PACKAGES_DIR, 'linux')
        for item in os.listdir(linux_dir):
            tf.add(os.path.join(linux_dir, item), arcname=item)
        for cf in COMMON_CORE_FILES:
            full = os.path.join(ROOT_DIR, cf)
            if os.path.exists(full):
                tf.add(full, arcname=cf)
        for asset in ['icon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png', 'manifest.json', 'sw.js', 'install.html', 'landing.html', 'admin.html']:
            p = os.path.join(ROOT_DIR, 'public', asset)
            if os.path.exists(p):
                tf.add(p, arcname=f'public/{asset}')
        add_dir_to_tar(tf, SERVER_MODULES_DIR, 'server')
        add_dir_to_tar(tf, PLUGINS_DIR, 'plugins')
        add_dir_to_tar(tf, COUNTRY_PACKS_DIR, 'countryPacks')
        add_dir_to_tar(tf, DIST_DIR, 'dist')
    print(f"[OK] Linux package created ({os.path.getsize(target_tar)} bytes)")

def build_chromeos_package():
    target_zip = os.path.join(PUBLIC_DOWNLOADS, 'shiftpulse-chromeos-package.zip')
    print(f"[*] Building ChromeOS installer package: {target_zip}")
    with zipfile.ZipFile(target_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        cos_dir = os.path.join(PACKAGES_DIR, 'chromeos')
        for item in os.listdir(cos_dir):
            zf.write(os.path.join(cos_dir, item), item)
        for cf in COMMON_CORE_FILES:
            full = os.path.join(ROOT_DIR, cf)
            if os.path.exists(full):
                zf.write(full, cf)
        for asset in ['icon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png', 'manifest.json', 'sw.js', 'install.html', 'landing.html', 'admin.html']:
            p = os.path.join(ROOT_DIR, 'public', asset)
            if os.path.exists(p):
                zf.write(p, f'public/{asset}')
        add_dir_to_zip(zf, SERVER_MODULES_DIR, 'server')
        add_dir_to_zip(zf, PLUGINS_DIR, 'plugins')
        add_dir_to_zip(zf, COUNTRY_PACKS_DIR, 'countryPacks')
        add_dir_to_zip(zf, DIST_DIR, 'dist')
    print(f"[OK] ChromeOS package created ({os.path.getsize(target_zip)} bytes)")

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if target in ('all', 'windows', 'win'):
        build_windows_package()
    if target in ('all', 'linux'):
        build_linux_package()
    if target in ('all', 'chromeos', 'cos'):
        build_chromeos_package()
    print("[GOTOVO] Svi odabrani paketi sa kompletnim dist/ bundle-om su uspešno generisani u /public/downloads/")
