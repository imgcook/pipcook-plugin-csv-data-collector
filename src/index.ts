/**
 * @file For plugin to collect test classification data
 */
import * as path from 'path';
import * as fs from 'fs-extra';
import glob from 'glob-promise';
import parse from 'csv-parse/lib/sync';
import { downloadAndExtractTo } from '@pipcook/pipcook-core';

const readCsvFile = (url: string): Promise<any[]> => {
  const records = parse(fs.readFileSync(url), {
    columns: true,
    skip_empty_lines: true,
    skip_lines_with_error: true
  });
  return records;
};

export enum TableColumnType {
  Number,
  String,
  Bool,
  Map,
  Datetime,
  Unknown
}

/**
 * collect csv data
 */
const textClassDataCollect = async (option: Record<string, any>): Promise<any> => {
  let {
    url = '',
    dataDir
  } = option;
  await fs.remove(dataDir);
  await fs.ensureDir(dataDir);

  const tempDir = await downloadAndExtractTo(url);
  const csvPaths = await glob(path.join(tempDir, '**', '+(train|validation|test)', '*.csv'));
  const trainData: any[] = [];
  const validationData: any[] = [];
  const testData: any[] = [];
  for (let i = 0; i < csvPaths.length; i++) {
    const csvPath = csvPaths[i];
    const splitString = csvPath.split(path.sep);
    const trainType = splitString[splitString.length - 2];
    const result = await readCsvFile(csvPath);
    const samples = result.map(item => {
      return {
        label: item['output'],
        data: item['﻿input']
      };
    });
    if (trainType === 'train') {
      trainData.push(...samples);
    }
    if (trainType === 'validation') {
      validationData.push(...samples);
    }
    if (trainType === 'test') {
      testData.push(...samples);
    }
  }
  let indexTrain = 0;
  let indexTest = 0;
  return {
    getDataSourceMetadata: () => {
      return {
        type: 0,
        size: {
          train: trainData.length,
          test: testData.length
        },
        tableSchema: [
          { name: 'input', type: TableColumnType.String },
          { name: 'output', type: TableColumnType.String }
        ],
        dataKeys: [ 'input' ]
      }
    },
    nextTest: async (): Promise<any> => {
      return testData[indexTest++];
    },
    nextTrain: async (): Promise<any> => {
      return trainData[indexTrain++];
    },
    nextBatchTest: async (batchSize: number): Promise<Array<any> | null> => {
      let result = [];
      for (let i = 0; i < batchSize; i++) {
        const s = testData[indexTest++];
        if (s) {
          result.push(s);
        } else {
          break;
        }
      }
      return result;
    },
    nextBatchTrain: async (batchSize: number): Promise<Array<any> | null> => {
      let result = [];
      for (let i = 0; i < batchSize; i++) {
        const s = testData[indexTrain++];
        if (s) {
          result.push(s);
        } else {
          break;
        }
      }
      return result;
    },
    seekTest: async (pos: number): Promise<void> => {
      indexTest = pos;
    },
    seekTrain: async (pos: number): Promise<void> => {
      indexTrain = pos;
    }
  };
};

export default textClassDataCollect;
