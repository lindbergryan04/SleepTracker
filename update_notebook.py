import json

# Read the notebook
with open('data_cleaning.ipynb', 'r') as f:
    notebook = json.load(f)

# Find the cell with our data processing code
for cell in notebook['cells']:
    if cell['cell_type'] == 'code' and 'activity_file' in ''.join(cell['source']):
        # Update the source code to filter for Day 1
        source = ''.join(cell['source'])
        source = source.replace(
            'df = pd.read_csv(activity_file)\n            for i in range',
            'df = pd.read_csv(activity_file)\n            # Filter for Day 1 only\n            day1_df = df[df[\'Day\'] == 1]\n            \n            for i in range'
        )
        source = source.replace(
            'total_time = df[df[\'Activity\']',
            'total_time = day1_df[day1_df[\'Activity\']'
        )
        cell['source'] = [source]

# Write the updated notebook
with open('data_cleaning.ipynb', 'w') as f:
    json.dump(notebook, f, indent=1) 