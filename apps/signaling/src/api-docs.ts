/**
 * API Documentation Generator
 * 
 * Generates OpenAPI documentation for the signaling server REST endpoints
 */

import swaggerUi from 'swagger-ui-express'
import { Express } from 'express'

const openApiDoc = {
  openapi: '3.0.0',
  info: {
    title: 'Vibe Signaling Server API',
    version: '1.0.0',
    description: 'WebRTC signaling server for Vibe video chat application',
    contact: {
      name: 'API Support',
      url: 'https://github.com/your-username/vibe'
    }
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Development server'
    },
    {
      url: 'https://api.vibe.app',
      description: 'Production server'
    }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check endpoint',
        description: 'Returns the current server status',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'ok'
                    },
                    timestamp: {
                      type: 'string',
                      format: 'date-time',
                      example: '2025-01-04T12:00:00.000Z'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/rooms': {
      post: {
        summary: 'Create a new room',
        description: 'Creates a new room for WebRTC session and returns the room ID',
        tags: ['Rooms'],
        responses: {
          '200': {
            description: 'Room created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    roomId: {
                      type: 'string',
                      format: 'uuid',
                      example: '123e4567-e89b-12d3-a456-426614174000'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/rooms/{roomId}': {
      get: {
        summary: 'Get room information',
        description: 'Retrieves information about a specific room including participants',
        tags: ['Rooms'],
        parameters: [
          {
            name: 'roomId',
            in: 'path',
            required: true,
            description: 'Unique room identifier',
            schema: {
              type: 'string',
              format: 'uuid'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Room information retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      format: 'uuid'
                    },
                    participants: {
                      type: 'array',
                      items: {
                        type: 'string'
                      },
                      example: ['user-123', 'user-456']
                    },
                    createdAt: {
                      type: 'string',
                      format: 'date-time'
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Room not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'string',
                      example: 'Room not found'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Room: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique room identifier'
          },
          participants: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'List of participant user IDs'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Room creation timestamp'
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'System',
      description: 'System health and status endpoints'
    },
    {
      name: 'Rooms',
      description: 'Room management endpoints'
    }
  ]
}

/**
 * Setup Swagger UI for API documentation
 * @param app Express application instance
 */
export function setupApiDocs(app: Express) {
  // Serve API documentation at /api-docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDoc, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Vibe API Documentation'
  }))

  // Also serve the raw OpenAPI spec
  app.get('/api-docs.json', (req, res) => {
    res.json(openApiDoc)
  })
}