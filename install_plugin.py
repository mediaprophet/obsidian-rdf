import os
import subprocess
import json
import shutil
import argparse
import sys

def check_git_installed():
    try:
        subprocess.run(['git', '--version'], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError:
        print("Git is not installed. Please install Git from https://git-scm.com/downloads")
        sys.exit(1)

def clone_repo(repo_url, clone_dir):
    if os.path.exists(clone_dir):
        print(f"Clone directory {clone_dir} already exists. Please remove it or choose a different directory.")
        sys.exit(1)
    subprocess.run(['git', 'clone', repo_url, clone_dir], check=True)

def get_plugin_info(manifest_path):
    with open(manifest_path, 'r') as f:
        manifest = json.load(f)
    if 'id' not in manifest or 'name' not in manifest:
        print("manifest.json is missing 'id' or 'name' fields.")
        sys.exit(1)
    return manifest['id'], manifest['name']

def copy_plugin_files(src_dir, dest_dir):
    os.makedirs(dest_dir, exist_ok=True)
    for file in ['main.js', 'manifest.json']:
        shutil.copy(os.path.join(src_dir, file), dest_dir)
    styles_path = os.path.join(src_dir, 'styles.css')
    if os.path.exists(styles_path):
        shutil.copy(styles_path, dest_dir)

def main():
    parser = argparse.ArgumentParser(description='Install Obsidian plugin from GitHub repository.')
    parser.add_argument('--repo', required=True, help='GitHub repository URL')
    parser.add_argument('--vault', required=True, help='Path to Obsidian vault')
    args = parser.parse_args()

    check_git_installed()

    repo_name = args.repo.split('/')[-1].replace('.git', '')
    clone_dir = os.path.join(os.getcwd(), repo_name)

    print("Cloning repository...")
    clone_repo(args.repo, clone_dir)
    print("Repository cloned successfully.")

    main_js_path = os.path.join(clone_dir, 'main.js')
    manifest_path = os.path.join(clone_dir, 'manifest.json')
    if not os.path.exists(main_js_path) or not os.path.exists(manifest_path):
        print("main.js or manifest.json not found in the repository.")
        sys.exit(1)

    print("Reading manifest.json...")
    plugin_id, plugin_name = get_plugin_info(manifest_path)
    print(f"Plugin ID: {plugin_id}")
    print(f"Plugin Name: {plugin_name}")

    vault_plugins_dir = os.path.join(args.vault, '.obsidian', 'plugins')
    if not os.path.exists(vault_plugins_dir):
        print(f"Obsidian plugins directory not found at {vault_plugins_dir}. Ensure the vault is properly set up.")
        sys.exit(1)

    plugin_dir = os.path.join(vault_plugins_dir, plugin_id)

    if os.path.exists(plugin_dir):
        response = input(f"Plugin directory {plugin_dir} already exists. Overwrite? (y/n): ")
        if response.lower() != 'y':
            print("Aborting installation.")
            sys.exit(1)
        else:
            shutil.rmtree(plugin_dir)

    print(f"Installing plugin to {plugin_dir}...")
    copy_plugin_files(clone_dir, plugin_dir)
    print(f"Plugin '{plugin_name}' installed successfully.")
    print("To enable the plugin, go to Settings > Community plugins > Installed plugins in Obsidian.")

if __name__ == '__main__':
    main()