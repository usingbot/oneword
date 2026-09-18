export const licenseAssets: [source: string, target: string][]
export const existingPdfNotices: [source: string, target: string][]
export function licenseContent(source: string): Promise<Buffer>
