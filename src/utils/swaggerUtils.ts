import * as yaml from 'js-yaml';

export class SwaggerUtils {
    generateRestClientOutput(openApiYaml: any): string {
        const info = openApiYaml.info;
        const baseUrl = `${openApiYaml.servers[0].url}`;
        const paths = openApiYaml.paths;
        const components = openApiYaml.components;

        let restClientOutput = "";
        restClientOutput += `### ${info.title}\n`;

        for (const endpoint in paths) {
            const methods = paths[endpoint];
            for (const operation in methods) {
                const details = methods[operation];
                restClientOutput += this.generateOperationBlock(operation, baseUrl, endpoint, details, components);
            }
        }
        return restClientOutput;
    }

    generateOperationBlock(operation: string, baseUrl: string, endpoint: string, details: any, components: any): string {
        const summary = details.summary ? `- ${details.summary}` : "";
        let operationBlock = `\n#${operation.toUpperCase()} ${summary}\n`;

        if (details.requestBody) {
            const content = details.requestBody.content;
            for (const content_type in content) {
                const exampleObject = this.getExampleObjectFromSchema(components, content[content_type].schema);
                operationBlock += `${operation.toUpperCase()} ${baseUrl}${endpoint} HTTP/1.1\n`;
                operationBlock += `Content-Type: ${content_type}\n`;
                operationBlock += `${JSON.stringify(exampleObject, null, 2)}\n\n`;
            }
        } else {
            operationBlock += `${operation.toUpperCase()} ${baseUrl}${endpoint} HTTP/1.1\n`;
        }
        operationBlock += '\n###';
        return operationBlock;
    }

    getExampleObjectFromSchema(components: any, schema: any): any {
        if (!schema) {
            return;
        }

        if (schema.$ref) {
            const schemaRef = schema.$ref;
            const schemaPath = schemaRef.replace("#/components/", "").split("/");
            schema = schemaPath.reduce((obj, key) => obj[key], components);
        }

        switch (schema.type) {
            case "object":
                const obj = {};
                for (const prop in schema.properties) {
                    if (schema.anyOf) {
                        return this.getExampleObjectFromSchema(components,
                            schema.anyOf[0]);
                    }
                    obj[prop] = this.getExampleObjectFromSchema(components, schema.properties[prop]);
                }
                return obj;
            case "array":
                return [this.getExampleObjectFromSchema(components, schema.items)];
            default:
                return schema.example || schema.type;
        }
    }

    parseOpenApiYaml(data: string): string | undefined {
        try {
            const openApiYaml = yaml.load(data);
            return this.generateRestClientOutput(openApiYaml);
        } catch (error) {
            throw error;
        }
    }
}
