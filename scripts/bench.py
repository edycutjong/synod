import subprocess
import sys
import os

def run_js_benchmark():
    script_dir = os.path.dirname(os.path.realpath(__file__))
    js_path = os.path.join(script_dir, "bench.js")
    
    if not os.path.exists(js_path):
        print(f"Error: JavaScript benchmark script not found at {js_path}", file=sys.stderr)
        sys.exit(1)
        
    try:
        # Run node scripts/bench.js and capture output
        result = subprocess.run(["node", js_path], capture_output=True, text=True, check=True)
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error executing JavaScript benchmark:\n{e.stderr}", file=sys.stderr)
        sys.exit(e.returncode)

if __name__ == "__main__":
    run_js_benchmark()
