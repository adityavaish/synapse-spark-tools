import * as vscode from 'vscode';
import { submitCodeCell } from './SynapseNotebookExecutor';

export class SynapseNotebookController {
    readonly label = 'Synapse kernel';
    readonly supportedLanguages = ['python', 'scala', 'spark'];

    private readonly _controller: vscode.NotebookController;
    private _executionOrder = 0;

    constructor(notebookType: string) {
        this._controller = vscode.notebooks.createNotebookController(
            `${notebookType}-controller-id`,
            notebookType,
            this.label
        );

        this._controller.supportedLanguages = this.supportedLanguages;
        this._controller.supportsExecutionOrder = true;
        this._controller.executeHandler = this._execute.bind(this);
    }

    private async _execute(
        cells: vscode.NotebookCell[],
        _notebook: vscode.NotebookDocument,
        _controller: vscode.NotebookController
    ): Promise<void> {
        for (let cell of cells) {
            await this._doExecution(cell);
        }
    }

    private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
        execution.start(Date.now());

        try {
            const sparkStatementOutput = await submitCodeCell(cell, execution);

            const outputs: vscode.NotebookCellOutputItem[] = [];
            for (let key in sparkStatementOutput.data) {
                outputs.push(
                    vscode.NotebookCellOutputItem.text(<string>sparkStatementOutput.data[key], key));
            }

            execution.replaceOutput(
                new vscode.NotebookCellOutput(outputs)
            );
        }
        catch {
            execution.replaceOutput(new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stdout('unknown')]));
        }
    }

    dispose(): void { }
}