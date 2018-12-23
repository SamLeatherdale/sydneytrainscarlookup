import csv
import json
import os.path
import sys

file = {}
simple_import = ['carnames', 'sets', 'cars', 'extras']
for dataset in simple_import:
    filename = "data_{}.csv".format(dataset)
    data = {}
    file[dataset] = data

    with open(filename) as csvfile:
        reader = csv.reader(csvfile)
        fieldnames = None
        for row in reader:
            if fieldnames is None:
                fieldnames = row
                continue

            values = {}
            if dataset == 'cars':
                for i in range(2, len(row)):
                    values[fieldnames[i]] = row[i]
                data[row[0] + "/" + row[1]] = values
            else:
                for i in range(1, len(row)):
                    values[fieldnames[i]] = row[i]
                data[row[0]] = values
            print(row)

#Import ranges
data = {}
file['ranges'] = data
with open('data_ranges.csv') as csvfile:
    reader = csv.DictReader(csvfile)

    for row in reader:
        print(row)

        if row['type'] not in data:
            data[row['type']] = []

        values = {'set': row['set'], 
			'start': int(row['start']), 
			'end': int(row['end']), 
			'extra': row['extra'],
			'letter': row['type']
		}
        data[row['type']].append(values)
        

with open(os.path.join(sys.path[0], "data.json"), "w") as outfile:
    outfile.write(json.dumps(file))
print(json.dumps(file))