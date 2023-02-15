import { SynapseManagementClient } from "@azure/arm-synapse";
import { AzureCliCredential } from "@azure/identity";

export const listPools = async (
  subscriptionId: string,
  resourceGroupName: string,
  workspaceName: string
) => {
  const client = new SynapseManagementClient(
    new AzureCliCredential(),
    subscriptionId
  );

  let pools = [];
  for await (let page of client.bigDataPools
    .listByWorkspace(resourceGroupName, workspaceName)
    .byPage({ maxPageSize: 10 })) {
    for (const pool of page) {
      pools.push(pool);
    }
  }
  return pools;
};