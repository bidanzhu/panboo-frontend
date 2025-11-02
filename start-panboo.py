#!/usr/bin/env python3
"""
Panboo Development Server Starter
Kills existing processes and starts frontend + backend
"""

import subprocess
import time
import os
import sys

# Configuration
FRONTEND_PORT = 3000
BACKEND_PORT = 3002
PROJECT_DIR = r"C:\DEV\panbooweb"

def print_header(text):
    """Print formatted header"""
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def kill_port(port):
    """Kill process running on specific port (Windows)"""
    try:
        # Find process using the port
        result = subprocess.run(
            f'netstat -ano | findstr :{port}',
            shell=True,
            capture_output=True,
            text=True
        )

        if result.stdout:
            # Extract PIDs
            lines = result.stdout.strip().split('\n')
            pids = set()
            for line in lines:
                parts = line.split()
                if len(parts) >= 5:
                    pid = parts[-1]
                    pids.add(pid)

            # Kill each PID
            for pid in pids:
                subprocess.run(f'taskkill /F /PID {pid}', shell=True, capture_output=True)
                print(f"  ✓ Killed process on port {port} (PID: {pid})")
        else:
            print(f"  ℹ No process found on port {port}")
    except Exception as e:
        print(f"  ⚠ Error killing port {port}: {e}")

def kill_all_node():
    """Kill all Node.js processes"""
    try:
        result = subprocess.run(
            'taskkill /F /IM node.exe',
            shell=True,
            capture_output=True,
            text=True
        )
        if "SUCCESS" in result.stdout or "SUCCESS" in result.stderr:
            print("  ✓ Killed all Node.js processes")
        else:
            print("  ℹ No Node.js processes found")
    except Exception as e:
        print(f"  ⚠ Error killing Node.js: {e}")

def start_backend():
    """Start backend server"""
    print(f"\n  Starting backend on port {BACKEND_PORT}...")
    backend_dir = os.path.join(PROJECT_DIR, "backend")

    # Start backend in background
    subprocess.Popen(
        'npm start',
        shell=True,
        cwd=backend_dir,
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )
    print(f"  ✓ Backend starting...")

def start_frontend():
    """Start frontend server"""
    print(f"\n  Starting frontend on port {FRONTEND_PORT}...")

    # Start frontend in background
    subprocess.Popen(
        'npm run dev',
        shell=True,
        cwd=PROJECT_DIR,
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )
    print(f"  ✓ Frontend starting...")

def main():
    """Main execution"""
    print_header("🐼 PANBOO DEVELOPMENT SERVER")

    # Step 1: Kill existing processes
    print_header("Step 1: Cleaning up existing processes")
    kill_port(FRONTEND_PORT)
    kill_port(BACKEND_PORT)
    kill_all_node()

    # Wait a moment for ports to be released
    print("\n  ⏳ Waiting for ports to be released...")
    time.sleep(2)

    # Step 2: Start services
    print_header("Step 2: Starting services")
    start_backend()
    time.sleep(3)  # Give backend time to start
    start_frontend()

    # Step 3: Display URLs
    print_header("🎉 PANBOO IS RUNNING!")
    print(f"""
  Frontend:  http://localhost:{FRONTEND_PORT}
  Backend:   http://localhost:{BACKEND_PORT}

  📝 Services are running in separate windows.
  🛑 Close those windows to stop the servers.

  ⚠️  Wait ~10 seconds for services to fully start.
    """)
    print("="*60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n  ⚠️  Script interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n  ❌ Error: {e}")
        sys.exit(1)
