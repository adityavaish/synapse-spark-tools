import { StorageManagementClient } from "@azure/arm-storage";
import { SubscriptionClient } from "@azure/arm-subscriptions";
import { BigDataPoolResourceInfo, SynapseManagementClient } from "@azure/arm-synapse";
import { AzureCliCredential } from "@azure/identity";
import { DataLakeServiceClient } from "@azure/storage-file-datalake";
import { EXT_CONFIG_ID } from "./extension";
import * as vscode from "vscode";

export const getCredentials = () => {
    return new AzureCliCredential();
};

export const showConfigureAll = async () => {
    let subscriptionId: string | undefined = undefined;
    let adlsTempAccount: string | undefined = undefined;
    let adlsTempContainer: string | undefined = undefined;

    subscriptionId = await showSubscriptionsSelection();

    if(!!subscriptionId) {
        await showSynapseWorkspaceSelection(subscriptionId);
    }

    if(!!subscriptionId) {
        adlsTempAccount = await showAdlsAccountSelection(subscriptionId);
    }

    if(!!adlsTempAccount) {
        adlsTempContainer = await showAdlsContainerSelection(adlsTempAccount);
    }

    if(!!adlsTempContainer) {
        await showAdlsPathInput(adlsTempContainer);
    }
};

export const showPoolsSelection = (
    pools: Array<BigDataPoolResourceInfo>
) => {
    const items: vscode.QuickPickItem[] = [];
    for (let index = 0; index < pools.length; index++) {
        const item = pools[index];
        items.push({
            label: item.name!,
            description: item.id,
        });
    }

    vscode.window
        .showQuickPick(items, { title: "Select Synapse Spark Pool" })
        .then(async (selection) => {
            // the user canceled the selection
            if (!selection) {
                return;
            }

            updateConfig("cluster", selection.label);
        });
};

export const showSubscriptionsSelection = async () => {
    const subClient = new SubscriptionClient(getCredentials());
    const subscriptions = [];

    for await (const item of subClient.subscriptions.list()) {
        subscriptions.push(item);
    }

    const items: vscode.QuickPickItem[] = [];

    for (let index = 0; index < subscriptions.length; index++) {
        const item = subscriptions[index];
        items.push({
            label: item.displayName!,
            description: item.subscriptionId,
        });
    }

    return vscode.window
        .showQuickPick(items, { title: "Select Azure Subscription" })
        .then(async (selection) => {
            // the user canceled the selection
            if (!selection) {
                return "";
            }

            updateConfig("subcriptionId", selection.description!);
            return !!selection.description ? selection.description : "";
        });
};

export const showSynapseWorkspaceSelection = async (subscriptionId: string) => {
    const synapseClient = new SynapseManagementClient(getCredentials(), subscriptionId);
    const workspaces = [];

    for await (const item of synapseClient.workspaces.list()) {
        workspaces.push(item);
    }

    const items: vscode.QuickPickItem[] = [];

    for (let index = 0; index < workspaces.length; index++) {
        const item = workspaces[index];
        const substring = item.id?.slice(item.id?.indexOf("resourceGroups/") + 15);
        const resourceGroup = substring?.slice(0, substring.indexOf("/"));

        items.push({
            label: item.name!,
            description: resourceGroup,
        });
    }

    return vscode.window
        .showQuickPick(items, { title: "Select Synapse Workspace" })
        .then(async (selection) => {
            // the user canceled the selection
            if (!selection) {
                return;
            }

            updateConfig("workspace", selection.label);
            updateConfig("resourceGroupName", selection.label);
            return !!selection.label ? selection.label : "";
        });
};

export const showAdlsAccountSelection = async (subscriptionId: string) => {
    const stgClient = new StorageManagementClient(getCredentials(), subscriptionId);
    const accounts = [];

    for await (const item of stgClient.storageAccounts.list()) {
        accounts.push(item);
    }

    const items: vscode.QuickPickItem[] = [];

    for (let index = 0; index < accounts.length; index++) {
        const item = accounts[index];
        items.push({
            label: item.name!,
            description: `${item.location}, ${item.kind}`,
        });
    }

    return vscode.window
        .showQuickPick(items, { title: "Select ADLS Account" })
        .then(async (selection) => {
            // the user canceled the selection
            if (!selection) {
                return;
            }

            updateConfig("adlsTempAccount", selection.label);
            return !!selection.label ? selection.label : "";
        });
};

export const showAdlsContainerSelection = async (account: string) => {
    const datalakeServiceClient = new DataLakeServiceClient(
        `https://${account}.dfs.core.windows.net`,
        getCredentials()
    );

    const fileSystems = new Array();
    for await (const fileSystem of datalakeServiceClient.listFileSystems()) {
        fileSystems.push(fileSystem);
    }

    const items: vscode.QuickPickItem[] = [];

    for (let index = 0; index < fileSystems.length; index++) {
        const item = fileSystems[index];
        items.push({
            label: item.name!,
            description: item.versionId,
        });
    }

    return vscode.window
        .showQuickPick(items, { title: "Select ADLS Container" })
        .then(async (selection) => {
            // the user canceled the selection
            if (!selection) {
                return;
            }

            updateConfig("adlsTempContainer", selection.label);
            return !!selection.label ? selection.label : "";
        });
};

export const showAdlsPathInput = async (container: string) => {
    await vscode.window.showInputBox({
        title: "Enter ADLS Path",
        value: "",
        valueSelection: [2, 4],
        placeHolder: `Path to temp location inside ${container} container, e.g. path/to/temp/location`,
        validateInput: (text) => {
            let result: string = "";

            if (!!text) {
                result = text.endsWith("/") ? text : text + "/";
            }

            const config = vscode.workspace.getConfiguration(EXT_CONFIG_ID);
            config.update(
                "adlsTempPath",
                result,
                vscode.ConfigurationTarget.Workspace
            );
            return null;
        },
    });
};

export const getConfig = (property: string): string => {
    const config = vscode.workspace.getConfiguration(EXT_CONFIG_ID);
    return config.get(property, "error");
};

export const updateConfig = async (property: string, value: string) => {
    const config = vscode.workspace.getConfiguration(EXT_CONFIG_ID);
    await config.update(
        property,
        value,
        vscode.ConfigurationTarget.Workspace
    );
};