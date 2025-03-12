import axios from "axios";
import { ChangeEvent, useRef, useState } from "react";

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function FileUploader() {
    const [file, setfile] = useState<File | null>(null);
    const [status, setStatus] = useState<UploadStatus>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [inputKey, setInputKey] = useState<number>(Date.now());

    function onFileChange(e: ChangeEvent<HTMLInputElement>) {
        if (e.target.files) {
            setfile(e.target.files[0]);
            setStatus("idle")
            setUploadProgress(0);
        }
    }

    async function processFileUpload() {
        if (!file) return;

        setStatus('uploading');
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await axios.post("https://localhost:7280/api/UDSFileParser/Process", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                responseType: 'blob',
                onUploadProgress: (progressEvent) => {
                    const progress = progressEvent.total
                        ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        : 0;
                    setUploadProgress(progress);
                },
            });

            setStatus("success");
            setUploadProgress(100);
            setfile(null);


            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);

            // Extract filename from headers if available
            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'downloaded-file';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename\*=(?:UTF-8'')?([^;\n]+)/i) ||
                    contentDisposition.match(/filename=(['"]?)([^'"\n;]+)\1/i);
                if (fileNameMatch) {
                    fileName = decodeURIComponent(fileNameMatch[1]);
                }
            }

            // Trigger download
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();

            // Cleanup
            link.remove();
            window.URL.revokeObjectURL(url);

        } catch {
            setStatus('error');
            setUploadProgress(0);
        } finally {
            setInputKey(Date.now());
        }
    }

    return <div>
        <div className="content-section">
            <div>
                <h3>Please Seletect a CAN log file</h3>
                <input className="button-secondary" type="file" key={inputKey} onChange={onFileChange} />
            </div>
        </div>

        {file && (
            <div className="sub-content-section">
                <p><b>File name:</b> {file.name}</p>
                <p><b>Size:</b> {(file.size / 1024).toFixed(2)} KB</p>
            </div>
        )}

        {file && status != "uploading" &&
            <div className="sub-content-section">
                <div>The procesed file will be downloaded automatically</div>
                <a className="button-primary" onClick={processFileUpload}>Process</a>
            </div>

        }

        {/* Create a progress bar */}
        {status == 'uploading' &&
            <div>
                <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <p className="progress-text">{uploadProgress}%</p>
            </div>
        }

        {status == 'success' &&
            <div className="sub-content-section">
                <p>The file was processed successfully.</p>
            </div>
        }

        {status == 'error' &&
            <div className="sub-content-section">
                <p>The file was processed failed.</p>
            </div>
        }

    </div>;
}