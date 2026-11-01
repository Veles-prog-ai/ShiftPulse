#!/usr/bin/env python3
"""
ShiftPulse Ledger Pro - Standalone Distribution Package Generator
Kreira 3 odvojena instalaciona paketa:
1. Windows (zip arhiva sa .bat, .ps1, Electron konfiguracijom)
2. Linux (tar.gz arhiva sa .sh, .desktop datotekom)
3. ChromeOS (zip arhiva sa PWA manifestom i Crostini skriptom)
"""

import os
import sys
import tarfile
import zipfile
import shutil
import json

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PUBLIC_DOWNLOADS = os.path.join(ROOT_DIR, 'public', 'downloads')
PACKAGES_DIR = os.path.join(ROOT_DIR, 'packages')

os.makedirs(PUBLIC_DOWNLOADS, exist_ok=True)

COMMON_CORE_FILES = [
    'server.js',
    'package.json',
    'main.js',
    'sys_metadata.json'
]

def add_file_to_zip(zip_handle, abs_path, arcname):
    if os.path.exists(abs_path):
        zip_handle.write(abs_path, arcname)

def add_file_to_tar(tar_handle, abs_path, arcname):
    if os.path.exists(abs_path):
        tar_handle.add(abs_path, arcname=arcname)

def build_windows_package():
    target_zip = os.path.join(PUBLIC_DOWNLOADS, 'shiftpulse-windows-package.zip')
    print(f"[*] Pravim Windows instalacioni paket: {target_zip}")
    with zipfile.ZipFile(target_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        win_dir = os.path.join(PACKAGES_DIR, 'windows')
        for item in os.listdir(win_dir):
            zf.write(os.path.join(win_dir, item), item)
        for cf in COMMON_CORE_FILES:
            full = os.path.join(ROOT_DIR, cf)
            if os.path.exists(full):
                zf.write(full, cf)
        # Dodavanje ikone i manifesta
        icon_path = os.path.join(ROOT_DIR, 'public', 'icon.svg')
        if os.path.exists(icon_path):
            zf.write(icon_path, 'public/icon.svg')
        manifest_path = os.path.join(ROOT_DIR, 'public', 'manifest.json')
        if os.path.exists(manifest_path):
            zf.write(manifest_path, 'public/manifest.json')
    print(f"[OK] Windows paket kreiran ({os.path.getsize(target_zip)} bajtova)")

def build_linux_package():
    target_tar = os.path.join(PUBLIC_DOWNLOADS, 'shiftpulse-linux-package.tar.gz')
    print(f"[*] Pravim Linux instalacioni paket: {target_tar}")
    with tarfile.open(target_tar, 'w:gz') as tf:
        linux_dir = os.path.join(PACKAGES_DIR, 'linux')
        for item in os.listdir(linux_dir):
            tf.add(os.path.join(linux_dir, item), arcname=item)
        for cf in COMMON_CORE_FILES:
            full = os.path.join(ROOT_DIR, cf)
            if os.path.exists(full):
                tf.add(full, arcname=cf)
        icon_path = os.path.join(ROOT_DIR, 'public', 'icon.svg')
        if os.path.exists(icon_path):
            tf.add(icon_path, arcname='public/icon.svg')
    print(f"[OK] Linux paket kreiran ({os.path.getsize(target_tar)} bajtova)")

def build_chromeos_package():
    target_zip = os.path.join(PUBLIC_DOWNLOADS, 'shiftpulse-chromeos-package.zip')
    print(f"[*] Pravim ChromeOS instalacioni paket: {target_zip}")
    with zipfile.ZipFile(target_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        cos_dir = os.path.join(PACKAGES_DIR, 'chromeos')
        for item in os.listdir(cos_dir):
            zf.write(os.path.join(cos_dir, item), item)
        for cf in COMMON_CORE_FILES:
            full = os.path.join(ROOT_DIR, cf)
            if os.path.exists(full):
                zf.write(full, cf)
        icon_path = os.path.join(ROOT_DIR, 'public', 'icon.svg')
        if os.path.exists(icon_path):
            zf.write(icon_path, 'public/icon.svg')
    print(f"[OK] ChromeOS paket kreiran ({os.path.getsize(target_zip)} bajtova)")

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if target in ('all', 'windows', 'win'):
        build_windows_package()
    if target in ('all', 'linux'):
        build_linux_package()
    if target in ('all', 'chromeos', 'cos'):
        build_chromeos_package()
    print("[GOTOVO] Svi odabrani paketi su uspesno generisani u /public/downloads/")
