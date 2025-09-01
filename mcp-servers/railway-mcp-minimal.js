#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { railwayClient } from "./railway-mcp/build/api/api-client.js";

// Import only essential tools
import { variableTools } from "./railway-mcp/build/tools/variable.tool.js";
import { deploymentTools } from "./railway-mcp/build/tools/deployment.tool.js";
import { serviceTools } from "./railway-mcp/build/tools/service.tool.js";
import { projectTools } from "./railway-mcp/build/tools/project.tool.js";

// Get token from command line if provided
const cliToken = process.argv[2];
if (cliToken) {
    process.env.RAILWAY_API_TOKEN = cliToken;
}

const server = new McpServer({
    name: "railway-mcp-minimal",
    version: "1.0.0",
});

// Register ONLY essential tools for day-to-day use
function registerMinimalTools(server) {
    const essentialTools = [
        // Variables (list, set, delete)
        ...variableTools.filter(tool => 
            ['list_service_variables', 'variable_set', 'variable_delete', 'variable_bulk_set'].includes(tool[0])
        ),
        // Deployments (trigger, status, logs)  
        ...deploymentTools.filter(tool =>
            ['deployment_trigger', 'deployment_status', 'deployment_logs'].includes(tool[0])
        ),
        // Service info only
        ...serviceTools.filter(tool => 
            ['service_info'].includes(tool[0])
        ),
        // Project environments only  
        ...projectTools.filter(tool =>
            ['project_environments'].includes(tool[0])
        )
    ];
    
    // Register each essential tool
    essentialTools.forEach((tool) => {
        server.tool(...tool);
    });
    
    console.error(`Registered ${essentialTools.length} essential Railway tools`);
}

// Register minimal toolset
registerMinimalTools(server);

// Connect server to stdio transport
async function main() {
    await railwayClient.initialize();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    const hasToken = railwayClient.getToken() !== null;
    console.error(hasToken
        ? "Railway MCP minimal server running with API token" + (cliToken ? " from command line" : " from environment")
        : "Railway MCP minimal server running without API token - use 'configure' tool to set token");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});