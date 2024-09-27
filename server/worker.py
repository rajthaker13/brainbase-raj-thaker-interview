import argparse

def worker(params):
    # Your code here

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--params', type=str, help='Params for worker')

    args = parser.parse_args()
    
    params = json.loads(args.params)

    worker(params)
