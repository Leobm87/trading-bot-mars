#!/usr/bin/env node
/**
 * Supabase MCP Server para ElTraderFinanciado
 * Proporciona herramientas para interactuar con la base de datos de Supabase
 * ENHANCED WITH HOOKS INTEGRATION
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import path from 'path';

// Hook execution helper
function executeHook(hookName, ...args) {
  try {
    const hookScript = path.join(process.cwd(), 'hooks', `${hookName}.js`);
    spawn('node', [hookScript, ...args], { 
      detached: true,
      stdio: 'ignore'
    });
  } catch (error) {
    console.error(`Hook ${hookName} failed:`, error.message);
  }
}

// Check for required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Create MCP server
const server = new Server(
  {
    name: 'supabase-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
const tools = [
  {
    name: 'supabase_list_tables',
    description: 'Lista todas las tablas disponibles en Supabase',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'supabase_query',
    description: 'Ejecuta una consulta SELECT en una tabla',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Nombre de la tabla',
        },
        columns: {
          type: 'string',
          description: 'Columnas a seleccionar (separadas por comas)',
        },
        filter: {
          type: 'object',
          description: 'Filtros para la consulta',
        },
        limit: {
          type: 'number',
          description: 'Límite de resultados',
        },
      },
      required: ['table'],
    },
  },
  {
    name: 'supabase_insert',
    description: 'Inserta datos en una tabla',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Nombre de la tabla',
        },
        data: {
          type: 'object',
          description: 'Datos a insertar',
        },
      },
      required: ['table', 'data'],
    },
  },
  {
    name: 'supabase_update',
    description: 'Actualiza datos en una tabla',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Nombre de la tabla',
        },
        data: {
          type: 'object',
          description: 'Datos a actualizar',
        },
        filter: {
          type: 'object',
          description: 'Filtros para identificar registros',
        },
      },
      required: ['table', 'data', 'filter'],
    },
  },
  {
    name: 'supabase_delete',
    description: 'Elimina datos de una tabla',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Nombre de la tabla',
        },
        filter: {
          type: 'object',
          description: 'Filtros para identificar registros a eliminar',
        },
      },
      required: ['table', 'filter'],
    },
  },
];

// Handler for listing tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools,
}));

// Handler for calling tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'supabase_list_tables':
        // Check the actual tables that exist in the database (updated schema)
        const actualTables = [
          'prop_firms',           // Main prop firms table
          'account_plans',        // Account plans with temporal versioning
          'trading_rules',        // Trading rules with flexible value types
          'payout_policies',      // Payout policies with temporal versioning
          'platforms',            // Trading platforms master table
          'firm_platforms',       // Firm-platform relationships
          'data_feeds',           // Market data feeds master table
          'firm_data_feeds',      // Firm data feed relationships and fees
          'restrictions',         // Geographical and platform restrictions
          'discounts',            // Discount codes with temporal versioning
          'faqs',                 // FAQ entries with multilingual support
          'price_history',        // Price history for tracking changes
          'change_log'            // Change log for audit trail
        ];
        
        // Check which tables actually exist
        const existingTables = [];
        for (const tableName of actualTables) {
          try {
            const { error } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true });
            
            if (!error) {
              existingTables.push({ table_name: tableName });
            }
          } catch (e) {
            // Table doesn't exist, skip it
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ tables: existingTables }, null, 2),
            },
          ],
        };

      case 'supabase_query':
        let query = supabase.from(args.table);
        
        if (args.columns) {
          query = query.select(args.columns);
        } else {
          query = query.select('*');
        }

        if (args.filter) {
          Object.entries(args.filter).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }

        if (args.limit) {
          query = query.limit(args.limit);
        }

        const { data: queryData, error: queryError } = await query;
        
        if (queryError) throw queryError;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ data: queryData || [] }, null, 2),
            },
          ],
        };

      case 'supabase_insert':
        const { data: insertData, error: insertError } = await supabase
          .from(args.table)
          .insert(args.data)
          .select();

        if (insertError) throw insertError;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ inserted: insertData }, null, 2),
            },
          ],
        };

      case 'supabase_update':
        const updateQuery = supabase.from(args.table).update(args.data);
        
        Object.entries(args.filter).forEach(([key, value]) => {
          updateQuery.eq(key, value);
        });

        const { data: updateData, error: updateError } = await updateQuery.select();

        if (updateError) throw updateError;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ updated: updateData }, null, 2),
            },
          ],
        };

      case 'supabase_delete':
        const deleteQuery = supabase.from(args.table).delete();
        
        Object.entries(args.filter).forEach(([key, value]) => {
          deleteQuery.eq(key, value);
        });

        const { data: deleteData, error: deleteError } = await deleteQuery.select();

        if (deleteError) throw deleteError;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ deleted: deleteData }, null, 2),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Supabase MCP Server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});