import path from 'path';
import { existsSync, unlinkSync } from 'fs';
import { $logged } from '../helpers/logHelpers';

export class ContentDeliveryNetwork {
    private readonly rootPath: string;

    constructor() {
        this.rootPath = 'cdn/';
    }

    public getObject(filePath: string) {
        let type = this.getType(filePath);
        let objectPath: string = path.join(this.rootPath, type, filePath);

        if (!objectPath || !existsSync(objectPath)) {
            return null;
        } else {
            return objectPath;
        }
    }

    public deleteObject(filePath: string) {
        try {
            if (!filePath) return;
            let type = this.getType(filePath);
            let objectPath: string = path.join(this.rootPath, type, filePath);

            if (existsSync(objectPath)) {
                unlinkSync(objectPath);
            } else {
                $logged(`File not found: ${objectPath}`, false, { from: 'cdn', file: objectPath });
            }
        } catch (error) {
            $logged(`Object deleting progress failed\n${error}`, false, { file: __filename.split('/src')[1] });
        }
    }

    public isImage(filePath: string) {
        const extension = path.extname(filePath).slice(1);
        return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension);
    }

    public isVideo(filePath: string) {
        const extension = path.extname(filePath).slice(1);
        return ['mp4', 'webm', 'ogg'].includes(extension);
    }

    public isAudio(filePath: string) {
        const extension = path.extname(filePath).slice(1);
        return ['mp3', 'wav', 'ogg'].includes(extension);
    }

    public getType(filePath: string) {
        if (this.isImage(filePath)) {
            return 'image';
        } else if (this.isVideo(filePath)) {
            return 'video';
        } else if (this.isAudio(filePath)) {
            return 'audio';
        } else {
            return 'other';
        }
    }
}
