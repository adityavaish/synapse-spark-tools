import { AzureCliCredential } from '@azure/identity';
import { SparkBatchJobOptions, SparkClient } from '@azure/synapse-spark';
import * as vscode from 'vscode';

export class SynapseJobManager {
	constructor() {
	}

	static submitBatchJob = async (
		subscriptionId: string,
		resourceGroupName: string,
		workspaceName: string,
		sparkPoolName: string,
		batchJobOptions: SparkBatchJobOptions
	) => {
		const client = new SparkClient(
		new AzureCliCredential(),
		`https://${workspaceName}.dev.azuresynapse.net`,
		sparkPoolName
		);
		let job = await client.sparkBatch.createSparkBatchJob(batchJobOptions);
	
		if (!!job) {
		let consoleOutput = vscode.window.createOutputChannel("Synapse Spark");
	
		consoleOutput.show();
		consoleOutput.appendLine("Job started");
		consoleOutput.appendLine(`Livy Job ID: ${job.id}`);
	
		const url = `https://web.azuresynapse.net/en/monitoring/sparkapplication/${batchJobOptions.name}?workspace=%2Fsubscriptions%2F${subscriptionId}%2FresourceGroups%2F${resourceGroupName}%2Fproviders%2FMicrosoft.Synapse%2Fworkspaces%2F${workspaceName}&livyId=${job.id}&sparkPoolName=${sparkPoolName}`;
		consoleOutput.appendLine(`Job: ${url}`);
		}
	};
}