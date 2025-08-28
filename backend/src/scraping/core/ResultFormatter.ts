import { CapturedURL } from './URLCaptureManager.js';
import { RouteExecutionResult } from './RouteExecutor.js';

export interface FormattedResults {
    markdown: string;
    json: any;
    summary: {
        totalURLs: number;
        appCount: number;
        flowCount: number;
        screenCount: number;
        keywordCount: number;
        executionTime: number;
    };
}

/**
 * Formats captured URLs into user-friendly presentations
 * Creates clean, organized output with proper categorization
 */
export class ResultFormatter {

    /**
     * Format comprehensive search results into user-friendly output
     */
    formatComprehensiveResults(
        results: RouteExecutionResult[],
        totalExecutionTime: number,
        userProblem?: string
    ): FormattedResults {
        const allURLs = results.flatMap(r => r.capturedURLs);

        // Group URLs by type and keyword
        const groupedResults = this.groupResultsByType(allURLs);

        // Generate summary statistics
        const summary = this.generateSummary(allURLs, totalExecutionTime);

        // Create markdown output
        const markdown = this.generateMarkdownOutput(groupedResults, summary, userProblem);

        // Create JSON output
        const json = this.generateJSONOutput(results, groupedResults, summary);

        return {
            markdown,
            json,
            summary
        };
    }

    /**
     * Format results for a specific route type
     */
    formatRouteResults(result: RouteExecutionResult): FormattedResults {
        const groupedResults = this.groupResultsByType(result.capturedURLs);
        const summary = this.generateSummary(result.capturedURLs, result.executionTime);

        const markdown = this.generateRouteMarkdown(result, groupedResults);
        const json = {
            route: result.routeType,
            keyword: result.keyword,
            platform: result.platform,
            success: result.success,
            capturedURLs: result.capturedURLs,
            summary
        };

        return {
            markdown,
            json,
            summary
        };
    }

    /**
     * Group results by type (apps, flows, screens) and organize by keyword
     */
    private groupResultsByType(urls: CapturedURL[]): {
        apps: { [keyword: string]: CapturedURL[] };
        flows: { [keyword: string]: CapturedURL[] };
        screens: { [keyword: string]: CapturedURL[] };
    } {
        const grouped = {
            apps: {} as { [keyword: string]: CapturedURL[] },
            flows: {} as { [keyword: string]: CapturedURL[] },
            screens: {} as { [keyword: string]: CapturedURL[] }
        };

        urls.forEach(url => {
            const keyword = url.keyword;

            if (url.type === 'app') {
                if (!grouped.apps[keyword]) grouped.apps[keyword] = [];
                grouped.apps[keyword].push(url);
            } else if (url.type === 'flow') {
                if (!grouped.flows[keyword]) grouped.flows[keyword] = [];
                grouped.flows[keyword].push(url);
            } else if (url.type === 'screen') {
                if (!grouped.screens[keyword]) grouped.screens[keyword] = [];
                grouped.screens[keyword].push(url);
            }
        });

        // Sort URLs within each group by relevance score
        Object.values(grouped.apps).forEach(urls => urls.sort((a, b) => b.relevanceScore - a.relevanceScore));
        Object.values(grouped.flows).forEach(urls => urls.sort((a, b) => b.relevanceScore - a.relevanceScore));
        Object.values(grouped.screens).forEach(urls => urls.sort((a, b) => b.relevanceScore - a.relevanceScore));

        return grouped;
    }

    /**
     * Generate summary statistics
     */
    private generateSummary(urls: CapturedURL[], executionTime: number) {
        const appCount = urls.filter(u => u.type === 'app').length;
        const flowCount = urls.filter(u => u.type === 'flow').length;
        const screenCount = urls.filter(u => u.type === 'screen').length;
        const keywordCount = new Set(urls.map(u => u.keyword)).size;

        return {
            totalURLs: urls.length,
            appCount,
            flowCount,
            screenCount,
            keywordCount,
            executionTime
        };
    }

    /**
     * Generate markdown output for comprehensive results
     */
    private generateMarkdownOutput(
        groupedResults: any,
        summary: any,
        userProblem?: string
    ): string {
        let markdown = '';

        // Header
        markdown += '# 🎨 Mobbin Design Inspiration Results\n\n';

        if (userProblem) {
            markdown += `**Your Request:** ${userProblem}\n\n`;
        }

        // Summary
        markdown += '## 📊 Summary\n\n';
        markdown += `- **${summary.totalURLs} total resources** found across ${summary.keywordCount} keywords\n`;
        markdown += `- **${summary.appCount} app pages** with design patterns and UI inspiration\n`;
        markdown += `- **${summary.flowCount} user flows** showing step-by-step interactions\n`;
        markdown += `- **${summary.screenCount} screen designs** with specific UI patterns\n`;
        markdown += `- **Execution time:** ${(summary.executionTime / 1000).toFixed(1)} seconds\n\n`;

        // Apps Section
        if (summary.appCount > 0) {
            markdown += '## 📱 Relevant Apps\n\n';
            markdown += '*Complete app experiences with comprehensive design patterns*\n\n';

            (Object.entries(groupedResults.apps) as [string, CapturedURL[]][]).forEach(([keyword, urls]) => {
                if (urls.length > 0) {
                    markdown += `### "${keyword}" Apps\n\n`;
                    urls.forEach((url, index) => {
                        markdown += `${index + 1}. **${url.title}**`;
                        if (url.appName && url.appName !== url.title) {
                            markdown += ` (${url.appName})`;
                        }
                        markdown += `\n`;
                        markdown += `   - ${url.description}\n`;
                        markdown += `   - Platform: ${url.platform.toUpperCase()}`;
                        if (url.category) {
                            markdown += ` | Category: ${url.category}`;
                        }
                        markdown += `\n`;
                        markdown += `   - 🔗 [View on Mobbin](${url.url})\n\n`;
                    });
                }
            });
        }

        // Flows Section
        if (summary.flowCount > 0) {
            markdown += '## 🔄 User Flows\n\n';
            markdown += '*Multi-step user journeys and interaction patterns*\n\n';

            (Object.entries(groupedResults.flows) as [string, CapturedURL[]][]).forEach(([keyword, urls]) => {
                if (urls.length > 0) {
                    markdown += `### "${keyword}" Flows\n\n`;
                    urls.forEach((url, index) => {
                        markdown += `${index + 1}. **${url.title}**`;
                        if (url.appName) {
                            markdown += ` from ${url.appName}`;
                        }
                        markdown += `\n`;
                        markdown += `   - ${url.description}\n`;
                        markdown += `   - Platform: ${url.platform.toUpperCase()}`;
                        if (url.category) {
                            markdown += ` | Category: ${url.category}`;
                        }
                        markdown += `\n`;
                        markdown += `   - 🔗 [View Flow](${url.url})\n\n`;
                    });
                }
            });
        }

        // Screens Section
        if (summary.screenCount > 0) {
            markdown += '## 🎨 Screen Designs\n\n';
            markdown += '*Individual screen patterns and UI components*\n\n';

            (Object.entries(groupedResults.screens) as [string, CapturedURL[]][]).forEach(([keyword, urls]) => {
                if (urls.length > 0) {
                    markdown += `### "${keyword}" Screens\n\n`;
                    urls.forEach((url, index) => {
                        markdown += `${index + 1}. **${url.title}**`;
                        if (url.appName) {
                            markdown += ` from ${url.appName}`;
                        }
                        markdown += `\n`;
                        markdown += `   - ${url.description}\n`;
                        markdown += `   - Platform: ${url.platform.toUpperCase()}`;
                        if (url.category) {
                            markdown += ` | Category: ${url.category}`;
                        }
                        markdown += `\n`;
                        markdown += `   - 🔗 [View Screen](${url.url})\n\n`;
                    });
                }
            });
        }

        // Footer
        markdown += '---\n\n';
        markdown += '*Results generated by Mobbin Design Inspiration Engine*\n';
        markdown += `*Captured on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*\n`;

        return markdown;
    }

    /**
     * Generate markdown for a single route result
     */
    private generateRouteMarkdown(result: RouteExecutionResult, groupedResults: any): string {
        let markdown = '';

        markdown += `# ${result.routeType.toUpperCase()} Route Results\n\n`;
        markdown += `**Keyword:** "${result.keyword}"\n`;
        markdown += `**Platform:** ${result.platform.toUpperCase()}\n`;
        markdown += `**Status:** ${result.success ? '✅ Success' : '❌ Failed'}\n`;
        markdown += `**Strategy:** ${result.strategy}\n`;
        markdown += `**Execution Time:** ${(result.executionTime / 1000).toFixed(1)} seconds\n\n`;

        if (result.errors.length > 0) {
            markdown += '## ⚠️ Errors\n\n';
            result.errors.forEach(error => {
                markdown += `- ${error}\n`;
            });
            markdown += '\n';
        }

        if (result.capturedURLs.length > 0) {
            markdown += `## 📋 Captured ${result.routeType.toUpperCase()}\n\n`;
            result.capturedURLs.forEach((url, index) => {
                markdown += `${index + 1}. **${url.title}**\n`;
                markdown += `   - ${url.description}\n`;
                markdown += `   - 🔗 [View on Mobbin](${url.url})\n\n`;
            });
        } else {
            markdown += `## 📋 No ${result.routeType} captured\n\n`;
            markdown += `No URLs were captured for this route. This could be due to:\n`;
            markdown += `- No relevant suggestions found for "${result.keyword}"\n`;
            markdown += `- Network or navigation issues\n`;
            markdown += `- Changes in Mobbin's interface\n\n`;
        }

        return markdown;
    }

    /**
     * Generate JSON output for API responses
     */
    private generateJSONOutput(results: RouteExecutionResult[], groupedResults: any, summary: any): any {
        return {
            meta: {
                timestamp: new Date().toISOString(),
                summary,
                generatedBy: 'Mobbin Design Inspiration Engine'
            },
            results: {
                apps: groupedResults.apps,
                flows: groupedResults.flows,
                screens: groupedResults.screens
            },
            execution: {
                routes: results.map(r => ({
                    type: r.routeType,
                    keyword: r.keyword,
                    platform: r.platform,
                    success: r.success,
                    executionTime: r.executionTime,
                    urlCount: r.capturedURLs.length,
                    strategy: r.strategy,
                    errors: r.errors
                }))
            }
        };
    }

    /**
     * Generate a quick summary for logging
     */
    generateQuickSummary(results: RouteExecutionResult[]): string {
        const totalURLs = results.reduce((sum, r) => sum + r.capturedURLs.length, 0);
        const successfulRoutes = results.filter(r => r.success).length;
        const totalRoutes = results.length;
        const keywords = new Set(results.map(r => r.keyword)).size;

        return `Captured ${totalURLs} URLs from ${keywords} keywords (${successfulRoutes}/${totalRoutes} routes successful)`;
    }

    /**
     * Format results for console output
     */
    formatConsoleOutput(results: RouteExecutionResult[]): string {
        let output = '\n' + '='.repeat(80) + '\n';
        output += '🎨 MOBBIN DESIGN INSPIRATION RESULTS\n';
        output += '='.repeat(80) + '\n\n';

        const summary = this.generateSummary(
            results.flatMap(r => r.capturedURLs),
            results.reduce((sum, r) => sum + r.executionTime, 0)
        );

        output += `📊 SUMMARY: ${summary.totalURLs} total URLs captured\n`;
        output += `   Apps: ${summary.appCount} | Flows: ${summary.flowCount} | Screens: ${summary.screenCount}\n`;
        output += `   Keywords: ${summary.keywordCount} | Time: ${(summary.executionTime / 1000).toFixed(1)}s\n\n`;

        results.forEach(result => {
            const status = result.success ? '✅' : '❌';
            output += `${status} ${result.routeType.toUpperCase()} - "${result.keyword}" (${result.platform})\n`;
            output += `   URLs: ${result.capturedURLs.length} | Time: ${(result.executionTime / 1000).toFixed(1)}s\n`;
            if (result.capturedURLs.length > 0) {
                result.capturedURLs.forEach((url, index) => {
                    output += `   ${index + 1}. ${url.title}\n`;
                    output += `      ${url.url}\n`;
                });
            }
            output += '\n';
        });

        output += '='.repeat(80) + '\n';
        return output;
    }
}
