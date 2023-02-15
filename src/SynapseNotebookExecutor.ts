import { KnownLivyStatementStates, KnownLivyStates, SparkClient, SparkSession, SparkSessionOptions, SparkStatement, SparkStatementOptions, SparkStatementOutput } from "@azure/synapse-spark";
import { getConfig, getCredentials } from "./ConfigurationManager";
import * as vscode from 'vscode';

const getEndpoint = () => {
    return `https://${getConfig("workspace")}.dev.azuresynapse.net/livyApi/versions/2019-11-01-preview/sparkPools/${getConfig("cluster")}`
};

let _sparkClient: SparkClient | undefined = undefined;
export const getSparkClient = (): SparkClient => {
    if (!_sparkClient) {
        _sparkClient = new SparkClient(getCredentials(), getEndpoint(), getConfig("cluster"));
    }

    return _sparkClient;
};

const sparkSessionOperations: SparkSessionOptions = {
    name: "vscode-spark-extension-session" + Date.now().toString(),
    driverCores: 32,
    executorCores: 32,
    executorCount: 2,
    driverMemory: "224g",
    executorMemory: "224g",
};

let _sparkSession: SparkSession | undefined = undefined;
export const getSparkSession = async (): Promise<SparkSession | undefined> => {
    const sparkClient = getSparkClient();

    if (!_sparkSession) {
        const runningSparkSessions = await sparkClient.sparkSessionOperations.getSparkSessions();
        if (runningSparkSessions.sessions) {
            _sparkSession = runningSparkSessions.sessions.find(x => x.state === KnownLivyStates.Idle || x.state === KnownLivyStates.Running);
        }

        if (!_sparkSession) {
            _sparkSession = await getSparkClient()?.sparkSessionOperations.createSparkSession(sparkSessionOperations);
        }
    }
    else {
        _sparkSession = await sparkClient.sparkSessionOperations.getSparkSession(_sparkSession.id);
    }

    return _sparkSession;
};

export const submitCodeCell = async (
    cell: vscode.NotebookCell,
    execution: vscode.NotebookCellExecution): Promise<SparkStatementOutput> => {

    const sparkClient = getSparkClient();
    const sparkSession = await getSparkSession();
    let sparkStatement: SparkStatement | undefined = undefined;

    if (sparkSession !== undefined) {
        const sparkStatementOptions: SparkStatementOptions = {
            code: cell.document.getText(),
            kind: 'spark',
        };

        sparkStatement = await sparkClient
            .sparkSessionOperations?.createSparkStatement(sparkSession.id, sparkStatementOptions);

        execution.replaceOutput(new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stdout(sparkStatement.state || 'unknown')]));
    }

    return new Promise(async (resolve, reject) => {
        if (sparkClient === undefined || sparkSession === undefined || sparkStatement === undefined) {
            reject();
            return;
        }

        const sparkStatementId = sparkStatement.id;

        const checkStatementUpdate = async () => {
            const sparkStatementUpdate = await sparkClient.sparkSessionOperations.getSparkStatement(sparkSession.id, sparkStatementId);
            const state = sparkStatementUpdate.state || 'unknown';



            switch (state) {
                case KnownLivyStatementStates.Running:
                case KnownLivyStatementStates.Waiting:
                case KnownLivyStatementStates.Cancelling:
                    setTimeout(() => {
                        checkStatementUpdate();
                    }, 1);
                    break;
                case KnownLivyStatementStates.Available:
                    if (sparkStatementUpdate && sparkStatementUpdate.output) {
                        resolve(sparkStatementUpdate.output);
                    }
                    else {
                        reject();
                    }
                    break;
                case KnownLivyStatementStates.Cancelled:
                case KnownLivyStatementStates.Error:
                    reject();
                    break;
            }
        };

        await checkStatementUpdate();
    });
};