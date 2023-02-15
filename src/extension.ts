import * as vscode from "vscode";
import { SynapseJobManager } from "./SynapseJobManager";
import { listPools } from "./SynapseUtils";
import { uploadFileToTempLocation } from "./StorageManager";
import { SynapseNotebookSerializer } from "./SynapseNotebookSerializer";
import { getConfig, showAdlsAccountSelection, showAdlsContainerSelection, showAdlsPathInput, showConfigureAll, showPoolsSelection, showSubscriptionsSelection, showSynapseWorkspaceSelection } from "./ConfigurationManager";
import { SynapseNotebookController } from "./SynapseNotebookController";

var path = require("path");

export const EXT_CONFIG_ID: string = "synapse-spark";

export async function activate(context: vscode.ExtensionContext) {
  const subscriptionId = String(getConfig("subscriptionId"));
  const resourceGroupName = String(getConfig("resourceGroupName"));
  const workspaceName = String(getConfig("workspace"));
  const cluster = String(getConfig("cluster"));
  // const pyFiles = getConfig("pyFiles"));

  const selectPool = vscode.commands.registerCommand(
    "synapse-spark.selectPool",
    async () => {
      const pools = await listPools(
        subscriptionId,
        resourceGroupName,
        workspaceName
      );
      showPoolsSelection(pools);
    }
  );

  const submitBatch = vscode.commands.registerCommand(
    "synapse-spark.submitBatch",
    async () => {
      const options = JSON.parse(JSON.stringify(getConfig("batchJobOptions")));
      const resourceGroup = String(getConfig("resourceGroupName"));
      const adlsTempAccount = String(getConfig("adlsTempAccount"));
      const adlsTempContainer = String(getConfig("adlsTempContainer"));
      const adlsTempPath = String(getConfig("adlsTempPath"));

      const fileName = path.basename(
        vscode.window.activeTextEditor?.document.fileName!
      );
      const fileContents = vscode.window.activeTextEditor?.document.getText()!;

      const now = new Date();
      const strDateTime = [
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds(),
      ].join("");

      await uploadFileToTempLocation(
        adlsTempAccount,
        adlsTempContainer,
        adlsTempPath,
        fileName,
        fileContents
      );

      options.file = `abfss://${adlsTempContainer}@${adlsTempAccount}.dfs.core.windows.net/${adlsTempPath}${fileName}`;
      options.name = `SparkBatch_${strDateTime}`;

      SynapseJobManager.submitBatchJob(
        subscriptionId,
        resourceGroup,
        workspaceName,
        cluster,
        options
      );
    }
  );

  const configureAzureSubscription = vscode.commands.registerCommand(
    "synapse-spark.configureAzureSubscription",
    async () => {
      await showSubscriptionsSelection();
    }
  );

  const configureSynapseWorkspace = vscode.commands.registerCommand(
    "synapse-spark.configureSynapseWorkspace",
    async () => {
      const config = vscode.workspace.getConfiguration(EXT_CONFIG_ID);
      const subscriptionId = String(getConfig("subscriptionId"));
      await showSynapseWorkspaceSelection(subscriptionId);
    }
  );

  const configureTempAdlsAccount = vscode.commands.registerCommand(
    "synapse-spark.configureTempAdlsAccount",
    async () => {
      const config = vscode.workspace.getConfiguration(EXT_CONFIG_ID);
      const subscriptionId = String(getConfig("subscriptionId"));
      await showAdlsAccountSelection(subscriptionId);
    }
  );

  const configureTempAdlsContainer = vscode.commands.registerCommand(
    "synapse-spark.configureTempAdlsContainer",
    async () => {
      const config = vscode.workspace.getConfiguration(EXT_CONFIG_ID);
      const account = String(getConfig("adlsTempAccount"));
      await showAdlsContainerSelection(account);
    }
  );

  const configureTempAdlsPath = vscode.commands.registerCommand(
    "synapse-spark.configureTempAdlsPath",
    async () => {
      const config = vscode.workspace.getConfiguration(EXT_CONFIG_ID);
      const container = String(getConfig("adlsTempContainer"));
      await showAdlsPathInput(container);
    }
  );

  const configureAll = vscode.commands.registerCommand(
    "synapse-spark.configureAll",
    async () => {
      await showConfigureAll();
    }
  );

  context.subscriptions.push(selectPool);
  context.subscriptions.push(submitBatch);
  context.subscriptions.push(configureAzureSubscription);
  context.subscriptions.push(configureSynapseWorkspace);
  context.subscriptions.push(configureTempAdlsAccount);
  context.subscriptions.push(configureTempAdlsContainer);
  context.subscriptions.push(configureTempAdlsPath);
  context.subscriptions.push(configureAll);

  const notebookType = 'synapse-spark';
  const synapseNotebookSerializer = vscode.workspace.registerNotebookSerializer(notebookType, new SynapseNotebookSerializer());
  const synapseNotebookController = new SynapseNotebookController(notebookType);
  context.subscriptions.push(synapseNotebookSerializer);
	context.subscriptions.push(synapseNotebookController);
}

// This method is called when your extension is deactivated
export function deactivate() { }