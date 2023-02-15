import { SparkStatementOutput } from '@azure/synapse-spark';
import * as vscode from 'vscode';

interface SynNotebookCell {
	cell_type: string;
	source: string[];
	execution_count: number;
	metadata: SynCellMetadata;
}

interface SynLanguageInfo {
	name: string;
}

interface SynMetadata {
    cellMetadata: SynCellMetadata;
	notebook?: SynNotebook;
}

interface SynCellMetadata {
	jupyter: any;
	nteract: any;
}

interface SynKernelSpec {
	name: string;
	display_name: string;
}

interface SynNotebookMetadata {
	language_info: SynLanguageInfo;
	saveOutput: boolean;
	enableDeugMode: boolean;
	kernelspec: SynKernelSpec;
	a365ComputeOptions: SynA365ComputeOptions;
	sessionKeepAliveTimeout: number;
	targetSparkConfiguration: string;
}

interface SynPropertiesFolder {
	name: string;
}

interface SynBigDataPool {
    referenceName: string;
    type: string;
}

interface SynAuth {
    type: string;
    authResource: string;
}

interface SynA365ComputeOptions {
    id: string;
    name: string;
    type: string;
    endpoint: string;
    auth: SynAuth;
    sparkVersion: string;
    nodeCount: number;
    cores: number;
    memory: number;
    automaticScaleJobs: boolean;
}

interface SynNotebookProperties {
	metadata: SynNotebookMetadata;
	cells: SynNotebookCell[];
	folder: SynPropertiesFolder;
	nbformat: number;
	nbformat_minor: number;
	bigDataPool: SynBigDataPool;
	targetSparkConfiguration: any;
	sessionProperties: any;
}

interface SynNotebook {
	name: string;
	properties: SynNotebookProperties;
}

interface SynapseNotebookExecutorResponse {
	state: string;
	completed?: boolean;
	success?: boolean;
	message?: string;
	error?: string;
	sparkStatementOutput?: SparkStatementOutput;
}

type onStateUpdateCallback = (cell: vscode.NotebookCell, response: SynapseNotebookExecutorResponse, execution: vscode.NotebookCellExecution) => void;