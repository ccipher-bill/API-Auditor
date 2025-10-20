import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- HELPERS ---
const throttledFetch = (url: RequestInfo, options: RequestInit, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
};

const getObjectValueByPath = (obj: any, path: string): any => {
    if (!path) return undefined;
    return path.split(/[.[\]]+/).filter(Boolean).reduce((acc, part) => acc && acc[part], obj);
};

const generateWebhookToken = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// --- ICONS ---
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>;
const ArrowDownIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>;
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement> & { title?: string }) => {
    const { title, ...rest } = props;
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...rest}>
            {title && <title>{title}</title>}
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
    );
};
const XCircleIcon = (props: React.SVGProps<SVGSVGElement> & { title?: string }) => {
    const { title, ...rest } = props;
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...rest}>
            {title && <title>{title}</title>}
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
    );
};
const ExclamationTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>;
const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" /></svg>;
const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.39-3.423 3.595c-.737.775-.242 2.057.695 2.181l4.81.65-1.83 4.401c-.321.772.782 1.583 1.573 1.003l3.423-3.595 4.753-.39 1.83-4.401c.321-.772-.782-1.583-1.573-1.003l-3.423 3.595-4.753.39-1.83-4.401c-.321-.772.782-1.583 1.573-1.003l3.423 3.595 4.753.39 1.83-4.401z" clipRule="evenodd" /></svg>;
const LightBulbIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M10 3.5a5.5 5.5 0 00-5.5 5.5c0 2.624 1.864 4.811 4.354 5.373-.347.39-.537.882-.537 1.377v1.25a.75.75 0 001.5 0v-1.25c0-.495-.19-1.042-.537-1.377C13.686 13.81 15.5 11.623 15.5 9A5.5 5.5 0 0010 3.5zM10 5a3.5 3.5 0 110 7 3.5 3.5 0 010-7z" /></svg>;
const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" /></svg>;
const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>;
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 01-8.832 0V4.478a.75.75 0 011.06-1.06l1.153 1.153a.75.75 0 001.06 0l1.153-1.153a.75.75 0 001.06 0l1.153 1.153a.75.75 0 001.06 0l1.153-1.153a.75.75 0 011.06 1.06zM4.118 8.514a.75.75 0 01.75.75V15a1 1 0 001 1h8a1 1 0 001-1V9.264a.75.75 0 011.5 0V15a2.5 2.5 0 01-2.5 2.5h-8A2.5 2.5 0 013.5 15V9.264a.75.75 0 01.618-.75z" clipRule="evenodd" /></svg>;
const CogIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M11.49 3.17a.75.75 0 01.447.898l-1.5 6A.75.75 0 019.5 10.5H5.75a.75.75 0 01-.75-.75V8.25a.75.75 0 01.75-.75h2.82a.75.75 0 00.727-.562l1.5-6a.75.75 0 01.898-.447zM15 9.75a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75h-.008a.75.75 0 01-.75-.75v-.008zM15 12.75a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75h-.008a.75.75 0 01-.75-.75v-.008zM12 15.75a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75h-.008a.75.75 0 01-.75-.75v-.008zM12 12.75a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75h-.008a.75.75 0 01-.75-.75v-.008zM9 15.75a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v-.008zm-3 0a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75v-.008zM6 12.75a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75v-.008zM9 12.75a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v-.008z" clipRule="evenodd" /></svg>;
const WarningIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>;
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>;
const LinkIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.665l3-3z" /><path d="M8.603 14.53a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 005.656 5.656l3-3a4 4 0 00-.225-5.865.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.665l-3 3z" /></svg>;
const ClipboardIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M15.906 4.344a2.5 2.5 0 00-3.536 0l-.707.707a2.5 2.5 0 003.536 3.536l.707-.707a2.5 2.5 0 000-3.536zM4.094 15.656a2.5 2.5 0 003.536 0l.707-.707a2.5 2.5 0 00-3.536-3.536l-.707.707a2.5 2.5 0 000 3.536z" clipRule="evenodd" /><path d="M8.225 9.225a.75.75 0 01.06-1.057l1.5-1.5a.75.75 0 011.057.06l1.5 1.5a.75.75 0 01-.06 1.057l-1.5 1.5a.75.75 0 01-1.057-.06l-1.5-1.5a.75.75 0 01-.06-1.057z" /></svg>;
const RefreshIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M15.312 11.342a1.25 1.25 0 01-1.651 1.895l-.336-.293a.75.75 0 00-1.01.036l-.82 1.013a3.75 3.75 0 11-4.994-5.323.75.75 0 00-.916-1.196 5.25 5.25 0 106.84 7.55l.336.292a2.75 2.75 0 003.95-3.886z" clipRule="evenodd" /></svg>;
const BeakerIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V5.75a.75.75 0 001.5 0V4.517c0-.25.16-.492.392-.555.233-.062.476-.094.722-.117C6.96 3.704 8.46 3.5 10 3.5s3.04.204 4.386.345c.246.023.49.055.722.117.233.063.392.306.392.555V5.75a.75.75 0 001.5 0V4.517c0-1.103-.806-2.068-1.93-2.207C13.408 2.106 11.716 2 10 2zM3 9.5a.75.75 0 000 1.5h14a.75.75 0 000-1.5H3zM5.33 12.438a.75.75 0 01.688.52l1.62 4.05a.75.75 0 01-1.476.584l-1.62-4.05a.75.75 0 01.788-1.104zM14.67 12.438a.75.75 0 00-.688.52l-1.62 4.05a.75.75 0 101.476.584l1.62-4.05a.75.75 0 00-.788-1.104z" clipRule="evenodd" /></svg>;
const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M12 2.25a.75.75 0 01.75.75v14a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7 6.25a.75.75 0 01.75.75v10a.75.75 0 01-1.5 0V7a.75.75 0 01.75-.75zM3 11.25a.75.75 0 01.75.75v5a.75.75 0 01-1.5 0v-5a.75.75 0 01.75-.75zM16 8.25a.75.75 0 01.75.75v8a.75.75 0 01-1.5 0v-8a.75.75 0 01.75-.75z" /></svg>;
const ArrowTrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M12.22 5.68a.75.75 0 011.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0l-2.25-2.25a.75.75 0 011.06-1.06l1.72 1.72 3.72-3.72z" /><path d="M4.5 5.5a.75.75 0 00-1.5 0v9a.75.75 0 00.75.75h9a.75.75 0 000-1.5H5.25V5.5z" /></svg>;
const ArrowTrendingDownIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M12.22 14.32a.75.75 0 001.06-1.06l-4.25-4.25a.75.75 0 00-1.06 0l-2.25 2.25a.75.75 0 101.06 1.06l1.72-1.72 3.72 3.72z" /><path d="M4.5 14.5a.75.75 0 01-1.5 0v-9a.75.75 0 01.75-.75h9a.75.75 0 010 1.5H5.25v8.25z" /></svg>;
const ShareIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M15.5 4.832a.75.75 0 00-1.06-.02L12.455 6.47a3.5 3.5 0 00-2.425.218l-1.84-1.06a3.5 3.5 0 10-1.155 2.05l1.84 1.06a3.5 3.5 0 000 2.644l-1.84 1.06a3.5 3.5 0 101.155 2.05l1.84-1.06a3.5 3.5 0 002.425.218l1.985 1.66a.75.75 0 101.08-1.04l-1.985-1.66a3.5 3.5 0 000-4.704l1.985-1.66a.75.75 0 00-.02-1.06zM5.5 6a2 2 0 100-4 2 2 0 000 4zm0 12a2 2 0 100-4 2 2 0 000 4zm10-7a2 2 0 10-4 0 2 2 0 004 0z" clipRule="evenodd" /></svg>;
const PaintBrushIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 2a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0V7z" clipRule="evenodd" /></svg>;
const CodeBracketIcon = (props: React.SVGProps<SVGSVGElement> & { title?: string }) => {
    const { title, ...rest } = props;
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...rest}>
            {title && <title>{title}</title>}
            <path fillRule="evenodd" d="M6.28 5.22a.75.75 0 010 1.06L2.56 10l3.72 3.72a.75.75 0 01-1.06 1.06L.97 10.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0zm7.44 0a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06L14.78 14.78a.75.75 0 01-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 010-1.06zM10.75 4.75a.75.75 0 01.75.75v8.5a.75.75 0 01-1.5 0v-8.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
        </svg>
    );
};
const KeyIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>;
const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.18l3.423-3.423a1.651 1.651 0 012.334 0L10 9.404l3.579-3.579a1.651 1.651 0 012.334 0l3.423 3.423a1.651 1.651 0 010 1.18l-3.423 3.423a1.651 1.651 0 01-2.334 0L10 10.59l-3.579 3.579a1.651 1.651 0 01-2.334 0L.664 10.59z" clipRule="evenodd" /></svg>;
const EyeSlashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.18l-3.423-3.423a1.651 1.651 0 00-2.334 0L10 9.404 4.341 3.745A10.009 10.009 0 003.28 2.22zM10 12.5a2.5 2.5 0 01-2.5-2.5 10.022 10.022 0 01.05-1.033l-1.428-1.428A4.001 4.001 0 0010 14.5a4 4 0 100-8 3.978 3.978 0 00-1.032.15l-1.428-1.428A5.5 5.5 0 0115.5 9c0 .48-.06.94-.17 1.382l-1.408-1.408a2.5 2.5 0 01-1.422-1.422l-1.408-1.408A5.485 5.485 0 0110 3.5a5.5 5.5 0 015.5 5.5c0 .678-.12 1.33-.352 1.936l-2.091-2.091a4.004 4.004 0 00-2.296-2.296L10 5.091a2.5 2.5 0 00-2.5 2.5c0 .313.056.613.163.89l-1.17-1.17A4.001 4.001 0 004.5 9c0 .35.044.688.128 1.01l-1.08-1.08A5.5 5.5 0 014.5 9a5.5 5.5 0 0110.155 1.55l-1.579-1.579A4.002 4.002 0 0010 7.5a2.5 2.5 0 00-2.5 2.5c0 .313.056.613.163.89l-1.17-1.17A4.001 4.001 0 004.5 9c0 .35.044.688.128 1.01l-1.08-1.08A5.5 5.5 0 014.5 9a5.5 5.5 0 0110.155 1.55l-1.579-1.579A4.002 4.002 0 0010 7.5a2.5 2.5 0 00-2.5 2.5c0 .313.056.613.163.89l-1.17-1.17A4.001 4.001 0 004.5 9c0 .35.044.688.128 1.01l-1.08-1.08A5.5 5.5 0 014.5 9a5.5 5.5 0 0110.155 1.55l-1.579-1.579A4.002 4.002 0 0010 7.5a2.5 2.5 0 00-2.5 2.5z" clipRule="evenodd" /></svg>;


// --- TYPES ---
type Plugin = {
  id: string;
  type: 'responseTimeSLA' | 'jsonAssertion';
  config: any; // Can be ResponseTimeSLAPluginConfig or JSONAssertionPluginConfig
};
type ScriptTestResult = { name: string; success: boolean; error?: string };
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'WS';
type Endpoint = {
  id: string;
  name: string;
  group: string;
  apiType: 'REST' | 'GraphQL' | 'WebSocket';
  protocol: 'http' | 'https' | 'ws' | 'wss';
  url: string;
  methods: HttpMethod[];
  headers: { key: string; value: string }[];
  body: string; // Used for REST body or GraphQL query
  variables: string; // Used for GraphQL variables
  wsMessage?: string; // Used for WebSocket message
  assertions: { type: 'statusCode'; value: string }[];
  plugins: Plugin[];
  customScript: string;
  dependencies?: string[];
  interval: 'fast' | 'normal' | 'slow';
  webhookToken: string;
};
type EndpointTemplate = {
    id: string;
    name: string;
    config: Partial<Omit<Endpoint, 'id' | 'name' | 'webhookToken' | 'dependencies'>>;
};
type HistoryItem = {
  id: string;
  endpointId: string;
  timestamp: number;
  success: boolean;
  method: HttpMethod;
  statusCode?: number;
  latency?: number;
  error?: string;
  responseBody?: string;
  requestHeaders?: { [key: string]: string };
  responseHeaders?: { [key: string]: string };
  pluginResults?: { pluginId: string; type: string; name: string; success: boolean; message: string }[];
  scriptResults?: ScriptTestResult[];
};
type AIAnalysisResult = {
    status: 'HEALTHY' | 'DEGRADED' | 'UNSTABLE' | 'FAILURE' | 'UNKNOWN';
    summary: string;
    keyMetrics: { name: string; value: string; trend?: 'UP' | 'DOWN' | 'NEUTRAL' }[];
    strengths: { text: string }[];
    weaknesses: { text: string }[];
    incidentAnalysis?: { text: string };
    recommendations: { text: string }[];
};
type ChartTimeRange = '1h' | '24h' | '7d' | 'all';
type BenchmarkConfig = {
    virtualUsers: number;
    duration: number; // in seconds
};
type BenchmarkRequestResult = {
    latency: number;
    success: boolean;
    statusCode: number | null;
};
type BenchmarkResult = {
    id: string;
    timestamp: number;
    config: BenchmarkConfig;
    metrics: {
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        requestsPerSecond: number;
        averageLatency: number;
        p95Latency: number;
        p99Latency: number;
        successRate: number;
    };
};
type Workspace = {
    id: string;
    name: string;
    endpoints: Endpoint[];
    history: HistoryItem[];
    benchmarkHistory: { [endpointId: string]: BenchmarkResult[] };
};
type Workspaces = {
    [key: string]: Workspace;
};
type AppSettings = {
    theme: 'system' | 'light' | 'dark';
    accentColor: string;
    templates: EndpointTemplate[];
    devMode: boolean;
};
type ViewType = 'dashboard' | 'endpoint' | 'map';

// --- CONSTANTS ---
const INTERVAL_MAP = { fast: 15000, normal: 60000, slow: 300000 };
const DEFAULT_ENDPOINT: Omit<Endpoint, 'id' | 'webhookToken'> = {
  name: '', group: '', url: '', protocol: 'https', apiType: 'REST', methods: ['GET'],
  headers: [], body: '', variables: '', wsMessage: '', assertions: [{ type: 'statusCode', value: '200' }],
  plugins: [], dependencies: [], interval: 'normal', customScript: '',
};
const DEFAULT_BENCHMARK_CONFIG: BenchmarkConfig = {
    virtualUsers: 10,
    duration: 15, // seconds
};
const DEFAULT_SETTINGS: AppSettings = {
    theme: 'system',
    accentColor: '#007bff',
    templates: [],
    devMode: false,
};
const INITIAL_AI_ANALYSIS: AIAnalysisResult = {
  status: 'UNKNOWN',
  summary: 'No analysis has been run for this endpoint yet.',
  keyMetrics: [],
  strengths: [],
  weaknesses: [],
  recommendations: [],
};
const PLUGIN_METADATA = {
    responseTimeSLA: { name: 'Response Time SLA', defaultConfig: { maxLatency: 500 } },
    jsonAssertion: { name: 'JSON Content Assertion', defaultConfig: { path: '', operator: 'equals', value: '' } },
};

// --- HOOKS ---
const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };
  return [storedValue, setValue];
};

// --- API & AI ---
const executeSingleCheck = async (endpoint: Endpoint, method: HttpMethod): Promise<Omit<HistoryItem, 'id' | 'timestamp'>> => {
    const startTime = Date.now();

    if (endpoint.apiType === 'WebSocket') {
        return new Promise((resolve) => {
            const wsUrl = `${endpoint.protocol}://${endpoint.url}`;
            let ws: WebSocket;
            try {
                ws = new WebSocket(wsUrl);
            } catch (e: any) {
                resolve({ endpointId: endpoint.id, method: 'WS', success: false, error: e.message || 'Invalid WebSocket URL.', latency: Date.now() - startTime });
                return;
            }

            const timeout = setTimeout(() => {
                ws.close();
                resolve({ endpointId: endpoint.id, method: 'WS', success: false, error: 'Connection timed out after 5s.', latency: Date.now() - startTime });
            }, 5000);

            ws.onopen = () => {
                if (endpoint.wsMessage) {
                    ws.send(endpoint.wsMessage);
                } else { // If no message, just a successful connection is enough
                    clearTimeout(timeout);
                    ws.close();
                     resolve({
                        endpointId: endpoint.id,
                        method: 'WS',
                        success: true,
                        statusCode: 101,
                        latency: Date.now() - startTime,
                        responseBody: 'Connection successful.'
                    });
                }
            };

            ws.onmessage = (event) => {
                clearTimeout(timeout);
                ws.close();
                const responseBody = String(event.data);
                const truncatedBody = responseBody.length > 5120 ? responseBody.substring(0, 5120) + '... (truncated)' : responseBody;
                resolve({
                    endpointId: endpoint.id,
                    method: 'WS',
                    success: true,
                    statusCode: 101, // Switching Protocols
                    latency: Date.now() - startTime,
                    responseBody: truncatedBody
                });
            };

            ws.onerror = () => {
                clearTimeout(timeout);
                resolve({ endpointId: endpoint.id, method: 'WS', success: false, error: 'WebSocket connection error.', latency: Date.now() - startTime });
            };
            
            ws.onclose = (event) => {
                if (!event.wasClean) {
                    clearTimeout(timeout);
                    resolve({ endpointId: endpoint.id, method: 'WS', success: false, error: `Connection closed unexpectedly. Code: ${event.code}`, latency: Date.now() - startTime });
                }
            };
        });
    }
    
    try {
        const headers = endpoint.headers.reduce((acc, h) => (h.key ? { ...acc, [h.key]: h.value } : acc), {});
        const isGraphQL = endpoint.apiType === 'GraphQL';
        const effectiveMethod = isGraphQL ? 'POST' : method;
        
        let requestBody: string | undefined;

        if (isGraphQL) {
            let variables = {};
            if (endpoint.variables && endpoint.variables.trim() !== '') {
                try {
                    variables = JSON.parse(endpoint.variables);
                } catch (e) {
                    return { endpointId: endpoint.id, method, success: false, error: 'Invalid JSON in variables.', latency: Date.now() - startTime };
                }
            }
            requestBody = JSON.stringify({ query: endpoint.body, variables });
        } else if (['POST', 'PUT', 'PATCH'].includes(effectiveMethod) && endpoint.body) {
            requestBody = endpoint.body;
        }

        const requestHeaders = { 'Content-Type': 'application/json', ...headers };

        const options: RequestInit = {
            method: effectiveMethod,
            headers: requestHeaders,
            body: requestBody,
        };

        const response = await throttledFetch(`${endpoint.protocol}://${endpoint.url}`, options);
        const responseText = await response.text();
        const latency = Date.now() - startTime;
        const truncatedBody = responseText.length > 5120 ? responseText.substring(0, 5120) + '... (truncated)' : responseText;
        const responseHeaders = Object.fromEntries(response.headers.entries());
        
        const baseSuccess = endpoint.assertions.every(a => {
            if (a.type === 'statusCode') return response.status.toString() === a.value;
            return false;
        });

        let responseBodyJson: any = null;
        let graphqlError: string | null = null;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            try {
                responseBodyJson = JSON.parse(responseText);
                if (isGraphQL && responseBodyJson && Array.isArray(responseBodyJson.errors) && responseBodyJson.errors.length > 0) {
                    graphqlError = `GraphQL Error: ${responseBodyJson.errors[0].message || 'Unknown GraphQL error'}`;
                }
            } catch (e) { /* Ignore parsing errors */ }
        }

        const pluginResults: HistoryItem['pluginResults'] = [];
        for (const plugin of endpoint.plugins) {
            let result = { pluginId: plugin.id, type: plugin.type, name: PLUGIN_METADATA[plugin.type].name, success: false, message: 'Plugin failed to run.' };
            if (plugin.type === 'responseTimeSLA') {
                const isSuccess = latency <= plugin.config.maxLatency;
                result.success = isSuccess;
                result.message = isSuccess ? `Latency ${latency}ms is within SLA of ${plugin.config.maxLatency}ms.` : `Latency ${latency}ms exceeded SLA of ${plugin.config.maxLatency}ms.`;
            } else if (plugin.type === 'jsonAssertion') {
                if (!responseBodyJson) {
                    result.message = 'Response was not valid JSON.';
                } else {
                    const actualValue = getObjectValueByPath(responseBodyJson, plugin.config.path);
                    const expectedValue = plugin.config.value;
                    let isSuccess = false;
                    switch (plugin.config.operator) {
                        case 'equals': isSuccess = String(actualValue) === expectedValue; break;
                        case 'notEquals': isSuccess = String(actualValue) !== expectedValue; break;
                        case 'contains': isSuccess = String(actualValue).includes(expectedValue); break;
                        case 'greaterThan': isSuccess = Number(actualValue) > Number(expectedValue); break;
                        case 'lessThan': isSuccess = Number(actualValue) < Number(expectedValue); break;
                    }
                    result.success = isSuccess;
                    result.message = isSuccess ? `Assertion passed: '${plugin.config.path}' (${actualValue}) ${plugin.config.operator} '${expectedValue}'.` : `Assertion failed: Expected '${plugin.config.path}' (${actualValue}) to be ${plugin.config.operator} '${expectedValue}'.`;
                }
            }
            pluginResults.push(result);
        }

        // --- Custom Script Execution ---
        const scriptResults: ScriptTestResult[] = [];
        let scriptError: string | undefined;
        if (endpoint.customScript && endpoint.customScript.trim() !== '') {
            const testResults: ScriptTestResult[] = [];
            
            const apm = {
                response: {
                    json: () => responseBodyJson,
                    text: () => responseText,
                    status: response.status,
                    headers: responseHeaders,
                    latency: latency,
                },
                test: (name: string, fn: () => void) => {
                    try {
                        fn();
                        testResults.push({ name, success: true });
                    } catch (e: any) {
                        testResults.push({ name, success: false, error: e.message || 'Assertion failed' });
                    }
                },
                assert: (condition: boolean, message = "Assertion failed") => {
                    if (!condition) {
                        throw new Error(message);
                    }
                }
            };

            try {
                const scriptFunction = new Function('apm', endpoint.customScript);
                scriptFunction(apm);
                scriptResults.push(...testResults);
            } catch (e: any) {
                scriptError = `Script execution error: ${e.message}`;
            }
        }
        // --- End Custom Script Execution ---

        const allPluginsSuccess = pluginResults.every(r => r.success);
        const allScriptsSuccess = scriptResults.every(r => r.success);
        const overallSuccess = baseSuccess && allPluginsSuccess && allScriptsSuccess && !graphqlError && !scriptError;

        return { 
            endpointId: endpoint.id, 
            method, 
            success: overallSuccess, 
            statusCode: response.status, 
            latency, 
            pluginResults, 
            scriptResults,
            responseBody: truncatedBody,
            requestHeaders,
            responseHeaders,
            error: graphqlError || scriptError || undefined 
        };

    } catch (error: any) {
        return { endpointId: endpoint.id, method, success: false, error: error.message, latency: Date.now() - startTime };
    }
};

const runChecks = async (endpoint: Endpoint): Promise<Omit<HistoryItem, 'id' | 'timestamp'>[]> => {
    if (endpoint.apiType === 'WebSocket') {
        const result = await executeSingleCheck(endpoint, 'WS');
        return [result];
    }
    const methodsToRun: HttpMethod[] = endpoint.apiType === 'GraphQL' ? ['POST'] : endpoint.methods;
    const checkPromises = methodsToRun.map(method => executeSingleCheck(endpoint, method));
    return Promise.all(checkPromises);
};


const suggestConfig = async (url: string): Promise<Partial<Endpoint>> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this API endpoint URL: "${url}". Suggest a configuration including: a name, group, the most likely HTTP method, protocol, a list of common request headers (e.g., 'Accept: application/json'), and an optional custom test script. The script should use the 'apm' object which has 'apm.test()', 'apm.assert()', and 'apm.response.json()'. If a script is not relevant, return an empty string.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "A short, descriptive name for the endpoint." },
            group: { type: Type.STRING, description: "A group name to categorize the endpoint." },
            method: { type: Type.STRING, description: "The suggested HTTP method ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')." },
            protocol: { type: Type.STRING, description: "The protocol ('http' or 'https')." },
            headers: {
                type: Type.ARRAY,
                description: "A list of suggested HTTP headers.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        key: { type: Type.STRING },
                        value: { type: Type.STRING }
                    },
                    required: ['key', 'value']
                }
            },
            customScript: { type: Type.STRING, description: "An optional example test script. Can be an empty string." }
          },
          required: ["name", "group", "method", "protocol", "headers", "customScript"],
        },
      }
    });
    const suggestion = JSON.parse(result.text);

    const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const suggestedMethod = (suggestion.method || '').toUpperCase();

    return {
      name: suggestion.name || '',
      group: suggestion.group || '',
      methods: validMethods.includes(suggestedMethod as HttpMethod) ? [suggestedMethod as HttpMethod] : ['GET'],
      protocol: suggestion.protocol === 'http' ? 'http' : 'https',
      assertions: [{ type: 'statusCode', value: '200' }],
      headers: suggestion.headers || [],
      customScript: suggestion.customScript || '',
    };
  } catch (error) {
    console.error("AI config suggestion failed:", error);
    throw error;
  }
};

const runDeepDiveAnalysis = async (endpoint: Endpoint, history: HistoryItem[]): Promise<AIAnalysisResult> => {
    if (!process.env.API_KEY) return {
        ...INITIAL_AI_ANALYSIS,
        summary: "The application's API Key is not configured. Please contact the administrator.",
        status: 'UNKNOWN'
    };
    if (history.length < 10) return {
        ...INITIAL_AI_ANALYSIS,
        summary: "Not enough data for a deep analysis. At least 10 checks are needed.",
        status: 'UNKNOWN'
    };

    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const prev24h = last24h - 24 * 60 * 60 * 1000;
    
    const recentHistory = history.filter(h => h.timestamp > last24h);
    const prevHistory = history.filter(h => h.timestamp <= last24h && h.timestamp > prev24h);

    const calculateStats = (hist: HistoryItem[]) => {
        if (hist.length === 0) return null;
        const successful = hist.filter(h => h.success);
        const latencies = successful.map(h => h.latency || 0).sort((a, b) => a - b);
        const mean = latencies.reduce((sum, l) => sum + l, 0) / latencies.length || 0;
        const stdDev = Math.sqrt(latencies.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / latencies.length) || 0;
        const errorTypes = hist.filter(h => !h.success).reduce((acc, h) => {
            const key = h.statusCode ? `Status ${h.statusCode}` : (h.error || 'Unknown Error');
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalChecks: hist.length,
            uptime: (successful.length / hist.length) * 100,
            avgLatency: mean,
            p50Latency: latencies[Math.floor(latencies.length * 0.50)] || 0,
            p95Latency: latencies[Math.floor(latencies.length * 0.95)] || 0,
            p99Latency: latencies[Math.floor(latencies.length * 0.99)] || 0,
            latencyStdDev: stdDev,
            errorTypes: errorTypes,
        };
    };

    const currentStats = calculateStats(recentHistory);
    const prevStats = calculateStats(prevHistory);

    if (!currentStats) return { ...INITIAL_AI_ANALYSIS, summary: "No checks in the last 24 hours." };

    const prompt = `
    You are a Senior Site Reliability Engineer (SRE). Analyze the health of the API endpoint "${endpoint.name}" based on the provided data. Provide a professional, data-driven analysis.

    Endpoint Configuration:
    - URL: ${endpoint.protocol}://${endpoint.url}
    - Methods: ${endpoint.methods.join(', ')}
    - Success Assertions: Status Code is ${endpoint.assertions[0]?.value || 'N/A'}.
    - Plugins: ${endpoint.plugins.map(p => PLUGIN_METADATA[p.type].name).join(', ') || 'None'}

    Performance Data (Last 24 Hours):
    - Uptime: ${currentStats.uptime.toFixed(2)}%
    - Total Checks: ${currentStats.totalChecks}
    - Average Latency: ${currentStats.avgLatency.toFixed(0)}ms
    - Median (P50) Latency: ${currentStats.p50Latency.toFixed(0)}ms
    - P95 Latency: ${currentStats.p95Latency.toFixed(0)}ms
    - P99 Latency: ${currentStats.p99Latency.toFixed(0)}ms
    - Latency Standard Deviation: ${currentStats.latencyStdDev.toFixed(0)}ms
    - Error Breakdown: ${JSON.stringify(currentStats.errorTypes)}
    
    Historical Comparison (Previous 24 Hours):
    - Previous Uptime: ${prevStats ? prevStats.uptime.toFixed(2) + '%' : 'N/A'}
    - Previous Average Latency: ${prevStats ? prevStats.avgLatency.toFixed(0) + 'ms' : 'N/A'}

    Last 5 Checks (most recent first):
    ${history.slice(0, 5).map(h => `- Success: ${h.success}, Status: ${h.statusCode || 'N/A'}, Latency: ${h.latency || 'N/A'}ms`).join('\n')}

    Analysis Guidelines:
    1.  **Status**: 'DEGRADED' for high latency (P95 significantly higher than average) or high std dev. 'UNSTABLE' for flapping uptime (e.g., 80-95%). 'FAILURE' for uptime < 80%.
    2.  **keyMetrics**: Populate with Uptime, Avg Latency, and P95 Latency. Calculate the 'trend' based on the historical comparison. 'UP' is good for uptime, 'DOWN' is good for latency.
    3.  **Strengths/Weaknesses**: Be specific. Mention low latency, high uptime, or stability as strengths. Mention high P99 latency, specific error codes, or high standard deviation as weaknesses.
    4.  **Incident Analysis**: Look for consecutive failures in the recent history to identify potential incidents. If there are none, omit this field.
    5.  **Recommendations**: Provide actionable advice for a developer. E.g., "Investigate the increase in 503 errors" or "Optimize the database query causing high P99 latency."
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        status: { type: Type.STRING, description: "The overall health status. Enum: 'HEALTHY', 'DEGRADED', 'UNSTABLE', 'FAILURE'." },
                        summary: { type: Type.STRING, description: "A concise, one-sentence executive summary of the endpoint's health." },
                        keyMetrics: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    value: { type: Type.STRING },
                                    trend: { type: Type.STRING, description: "Trend direction. Enum: 'UP', 'DOWN', 'NEUTRAL'." },
                                },
                                required: ['name', 'value']
                            }
                        },
                        strengths: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { text: { type: Type.STRING } },
                                required: ['text']
                            }
                        },
                        weaknesses: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { text: { type: Type.STRING } },
                                required: ['text']
                            }
                        },
                        incidentAnalysis: {
                            type: Type.OBJECT,
                            properties: { text: { type: Type.STRING } },
                        },
                        recommendations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { text: { type: Type.STRING } },
                                required: ['text']
                            }
                        }
                    },
                    required: ["status", "summary", "keyMetrics", "strengths", "weaknesses", "recommendations"]
                }
            },
        });

        const parsedResult = JSON.parse(result.text) as AIAnalysisResult;
        return {
            ...INITIAL_AI_ANALYSIS,
            ...parsedResult
        };

    } catch (error) {
        console.error("AI deep dive failed:", error);
        return {
            ...INITIAL_AI_ANALYSIS,
            summary: "An error occurred during the AI analysis. Please check your API key and try again.",
            status: 'UNKNOWN'
        };
    }
};

const runBenchmark = async (
    endpoint: Endpoint, 
    config: BenchmarkConfig, 
    onProgress: (progress: number, liveResults: { rps: number, avgLatency: number, errors: number }) => void,
    abortSignal: AbortSignal
): Promise<BenchmarkResult> => {
    const { virtualUsers, duration } = config;
    const startTime = Date.now();
    const endTime = startTime + duration * 1000;
    const allResults: BenchmarkRequestResult[] = [];
    
    const methodToTest = endpoint.methods[0];

    let lastProcessedIndex = 0;
    let liveSuccessfulReqs = 0;
    let liveTotalLatency = 0;

    const progressInterval = setInterval(() => {
        if (abortSignal.aborted) {
            clearInterval(progressInterval);
            return;
        }

        const newResults = allResults.slice(lastProcessedIndex);
        lastProcessedIndex = allResults.length;

        for (const result of newResults) {
            if (result.success) {
                liveSuccessfulReqs++;
                liveTotalLatency += result.latency;
            }
        }
        
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min((elapsed / duration) * 100, 100);
        
        const currentRps = allResults.length / elapsed || 0;
        const currentAvgLatency = liveSuccessfulReqs > 0 ? liveTotalLatency / liveSuccessfulReqs : 0;
        const currentErrors = allResults.length - liveSuccessfulReqs;
        
        onProgress(progress, { rps: currentRps, avgLatency: currentAvgLatency, errors: currentErrors });
    }, 500);

    const runSingleRequest = async (): Promise<BenchmarkRequestResult> => {
        const reqStartTime = Date.now();
        try {
            const headers = endpoint.headers.reduce((acc, h) => (h.key ? { ...acc, [h.key]: h.value } : acc), {});
            const options: RequestInit = {
                method: methodToTest,
                headers: { 'Content-Type': 'application/json', ...headers },
                body: ['POST', 'PUT', 'PATCH'].includes(methodToTest) && endpoint.body ? endpoint.body : undefined,
                signal: abortSignal,
            };
            const response = await throttledFetch(`${endpoint.protocol}://${endpoint.url}`, options, 20000); // 20s timeout for load test requests
            const latency = Date.now() - reqStartTime;
            const baseSuccess = endpoint.assertions.every(a => a.type === 'statusCode' && response.status.toString() === a.value);
            return { latency, success: baseSuccess, statusCode: response.status };
        } catch (error: any) {
             if (error.name === 'AbortError') {
                throw error;
            }
            return { latency: Date.now() - reqStartTime, success: false, statusCode: null };
        }
    };
    
    const worker = async () => {
        while (Date.now() < endTime && !abortSignal.aborted) {
            try {
                const result = await runSingleRequest();
                allResults.push(result);
            } catch (error) {
                break;
            }
        }
    };

    const workers = Array(virtualUsers).fill(0).map(worker);
    await Promise.all(workers);

    clearInterval(progressInterval);

    if (abortSignal.aborted) {
        const abortError = new Error('The test was canceled by the user.');
        abortError.name = 'AbortError';
        throw abortError;
    }
    
    const latencies = allResults.filter(r => r.success).map(r => r.latency).sort((a, b) => a - b);
    const totalRequests = allResults.length;
    const successfulRequests = latencies.length;
    const failedRequests = totalRequests - successfulRequests;
    const requestsPerSecond = totalRequests / duration;
    const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length || 0;
    
    onProgress(100, { rps: requestsPerSecond, avgLatency: averageLatency, errors: failedRequests });
    
    const metrics: BenchmarkResult['metrics'] = {
        totalRequests,
        successfulRequests,
        failedRequests,
        requestsPerSecond: requestsPerSecond,
        averageLatency: averageLatency,
        p95Latency: latencies[Math.floor(latencies.length * 0.95)] || 0,
        p99Latency: latencies[Math.floor(latencies.length * 0.99)] || 0,
        successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
    };
    
    return {
        id: `bm_${Date.now()}`,
        timestamp: Date.now(),
        config,
        metrics,
    };
};

const discoverEndpoints = async (baseUrl: string): Promise<{name: string, path: string, method: HttpMethod}[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this base API URL: "${baseUrl}". Suggest up to 5 common REST API endpoints that might exist under this base URL. For each endpoint, provide a relative path (e.g., '/users', '/products/{id}'), the most likely HTTP method, and a descriptive name. Focus on standard, high-level resources.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        endpoints: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING, description: "A short, descriptive name for the endpoint (e.g., 'Get All Users')." },
                                    path: { type: Type.STRING, description: "The relative path of the endpoint (e.g., '/users')." },
                                    method: { type: Type.STRING, description: "The suggested HTTP method ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')." },
                                },
                                required: ["name", "path", "method"],
                            }
                        }
                    },
                    required: ["endpoints"],
                },
            }
        });
        const suggestion = JSON.parse(result.text);
        const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        
        return suggestion.endpoints
            .map((ep: any) => ({ ...ep, method: ep.method.toUpperCase() }))
            .filter((ep: any) => validMethods.includes(ep.method as HttpMethod));
            
    } catch (error) {
        console.error("AI endpoint discovery failed:", error);
        throw error;
    }
}


// --- COMPONENTS ---
const AutoSetupModal = ({ onAddMultiple, onCancel }: { onAddMultiple: (endpoints: Omit<Endpoint, 'id' | 'webhookToken'>[]) => void; onCancel: () => void; }) => {
    const [step, setStep] = useState<'input' | 'loading' | 'review' | 'error'>('input');
    const [baseUrl, setBaseUrl] = useState('');
    const [protocol, setProtocol] = useState<Endpoint['protocol']>('https');
    const [discoveredEndpoints, setDiscoveredEndpoints] = useState<{name: string, path: string, method: HttpMethod}[]>([]);
    const [selectedEndpointIndices, setSelectedEndpointIndices] = useState<Set<number>>(new Set());
    const [error, setError] = useState<string | null>(null);

    const handleDiscover = async () => {
        if (!baseUrl) return;
        setStep('loading');
        setError(null);
        try {
            const results = await discoverEndpoints(`${protocol}://${baseUrl}`);
            setDiscoveredEndpoints(results);
            setSelectedEndpointIndices(new Set(results.map((_, i) => i))); // Select all by default
            setStep('review');
        } catch (err: any) {
            const errorMessage = err?.message || String(err);
            if (errorMessage.includes('API Key')) {
                setError('The application API Key is invalid or missing.');
            } else if (errorMessage.includes('429') || errorMessage.toUpperCase().includes('RESOURCE_EXHAUSTED')) {
                setError('AI quota exceeded. Please wait a moment and try again.');
            } else {
                setError('AI failed to discover endpoints. Please check the base URL or try again.');
            }
            setStep('error');
        }
    };
    
    const handleToggleSelection = (index: number) => {
        setSelectedEndpointIndices(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const handleAddSelected = () => {
        const endpointsToAdd = discoveredEndpoints
            .filter((_, i) => selectedEndpointIndices.has(i))
            .map(ep => ({
                ...DEFAULT_ENDPOINT,
                name: ep.name,
                group: 'Discovered',
                url: `${baseUrl}${ep.path}`,
                protocol,
                apiType: 'REST' as const,
                methods: [ep.method],
                assertions: [{ type: 'statusCode' as const, value: '200' }],
            }));
        onAddMultiple(endpointsToAdd);
    };

    const renderContent = () => {
        switch (step) {
            case 'loading':
                return (
                    <div className="auto-setup-status">
                        <div className="spinner" />
                        <p>AI is analyzing your API...</p>
                        <span>This may take a moment.</span>
                    </div>
                );
            case 'error':
                 return (
                    <div className="auto-setup-status">
                        <XCircleIcon className="status-down" style={{width: 48, height: 48}} />
                        <p>Analysis Failed</p>
                        <span>{error}</span>
                        <button className="submit-btn" onClick={() => setStep('input')}>Try Again</button>
                    </div>
                );
            case 'review':
                return (
                    <>
                        <h3>Discovered Endpoints</h3>
                        <p className="form-tip">Select the endpoints you want to start monitoring.</p>
                        <div className="discovered-endpoints-list">
                            {discoveredEndpoints.length === 0 ? (
                                <p className="placeholder-text">The AI could not find any common endpoints for this URL.</p>
                            ) : (
                                discoveredEndpoints.map((ep, index) => (
                                <label key={index} className="discovered-endpoint-item">
                                    <input
                                        type="checkbox"
                                        checked={selectedEndpointIndices.has(index)}
                                        onChange={() => handleToggleSelection(index)}
                                    />
                                    <div className="endpoint-info">
                                        <span className={`method-badge method-${ep.method.toLowerCase()}`}>{ep.method}</span>
                                        <strong>{ep.name}</strong>
                                        <span className="endpoint-path">{ep.path}</span>
                                    </div>
                                </label>
                            )))}
                        </div>
                        <div className="form-actions">
                            <button type="button" className="cancel-btn" onClick={() => setStep('input')}>Back</button>
                            <button type="submit" className="submit-btn" onClick={handleAddSelected} disabled={selectedEndpointIndices.size === 0}>
                                Add {selectedEndpointIndices.size} Endpoints
                            </button>
                        </div>
                    </>
                );
            case 'input':
            default:
                return (
                    <>
                        <h3>Auto-setup with AI</h3>
                        <p className="form-tip">Enter your API's base URL. The AI will attempt to discover common endpoints to monitor.</p>
                        <div className="form-group">
                            <label>Base API URL</label>
                             <div className="url-input">
                                <select value={protocol} onChange={e => setProtocol(e.target.value as Endpoint['protocol'])}>
                                    <option value="https">https://</option>
                                    <option value="http">http://</option>
                                </select>
                                <input
                                    type="text"
                                    value={baseUrl}
                                    onChange={e => setBaseUrl(e.target.value.replace(/^(https?:\/\/)/, ''))}
                                    placeholder="e.g., api.myapp.com/v1"
                                />
                            </div>
                        </div>
                         <div className="form-actions">
                            <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
                            <button type="submit" className="submit-btn" onClick={handleDiscover} disabled={!baseUrl}>
                                <SparklesIcon /> Discover Endpoints
                            </button>
                        </div>
                    </>
                );
        }
    };
    
    return (
        <div className="modal-overlay">
            <div className="modal-content auto-setup-modal">
                {renderContent()}
            </div>
        </div>
    );
};

const AddEndpointForm = ({ allEndpoints, onAdd, onCancel, templates }: { allEndpoints: Endpoint[]; onAdd: (endpoint: Omit<Endpoint, 'id' | 'webhookToken'>) => void; onCancel: () => void; templates: EndpointTemplate[]; }) => {
  const [endpoint, setEndpoint] = useState<Omit<Endpoint, 'id' | 'webhookToken'>>(DEFAULT_ENDPOINT);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'headers' | 'body' | 'script'>('config');
  const [isScriptAiGenerated, setIsScriptAiGenerated] = useState(false);

  useEffect(() => {
    setEndpoint(prev => {
        let newEndpoint = {...prev};
        if (prev.apiType === 'GraphQL') {
            if (prev.methods.length !== 1 || prev.methods[0] !== 'POST') newEndpoint.methods = ['POST'];
            if (prev.protocol !== 'http' && prev.protocol !== 'https') newEndpoint.protocol = 'https';
        } else if (prev.apiType === 'WebSocket') {
            if (prev.protocol !== 'ws' && prev.protocol !== 'wss') newEndpoint.protocol = 'wss';
            if (prev.methods.length !== 1 || prev.methods[0] !== 'WS') newEndpoint.methods = ['WS'];
        } else { // REST
            if (prev.protocol !== 'http' && prev.protocol !== 'https') newEndpoint.protocol = 'https';
            const validRestMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
            if (prev.methods.some(m => !validRestMethods.includes(m))) {
                newEndpoint.methods = ['GET'];
            }
        }
        return newEndpoint;
    });
  }, [endpoint.apiType]);

  const handleChange = (field: keyof Omit<Endpoint, 'id' | 'webhookToken'>, value: any) => {
    setEndpoint(prev => ({ ...prev, [field]: value }));
  };
  
  const handleMethodChange = (method: HttpMethod) => {
    const currentMethods = endpoint.methods;
    const newMethods = currentMethods.includes(method)
        ? currentMethods.filter(m => m !== method)
        : [...currentMethods, method];
    
    if (newMethods.length > 0) {
        handleChange('methods', newMethods);
    }
  };

  const handlePluginChange = (pluginId: string, newConfig: any) => {
    handleChange('plugins', endpoint.plugins.map(p => p.id === pluginId ? { ...p, config: newConfig } : p));
  };
  const handleAddPlugin = (type: keyof typeof PLUGIN_METADATA) => {
    const newPlugin: Plugin = {
        id: `plg_${Date.now()}`,
        type,
        config: PLUGIN_METADATA[type].defaultConfig,
    };
    handleChange('plugins', [...endpoint.plugins, newPlugin]);
  };
  const handleRemovePlugin = (id: string) => {
      handleChange('plugins', endpoint.plugins.filter(p => p.id !== id));
  };
  const handleDependencyChange = (dependencyId: string) => {
    const currentDeps = endpoint.dependencies || [];
    const newDeps = currentDeps.includes(dependencyId)
      ? currentDeps.filter(id => id !== dependencyId)
      : [...currentDeps, dependencyId];
    handleChange('dependencies', newDeps);
  };

  const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...endpoint.headers];
    newHeaders[index][field] = value;
    handleChange('headers', newHeaders);
  };
  
  const handleAddHeader = () => handleChange('headers', [...endpoint.headers, { key: '', value: '' }]);
  const handleRemoveHeader = (index: number) => handleChange('headers', endpoint.headers.filter((_, i) => i !== index));

  const handleAssertionChange = (index: number, field: 'type' | 'value', value: string) => {
    const newAssertions = [...endpoint.assertions];
    if (field === 'type') {
        newAssertions[index].type = value as 'statusCode';
    } else {
        newAssertions[index].value = value;
    }
    handleChange('assertions', newAssertions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (endpoint.name && endpoint.url) {
      onAdd(endpoint);
      setEndpoint(DEFAULT_ENDPOINT);
    }
  };
  
  const handleSuggest = async () => {
    if (!endpoint.url) return;
    setIsSuggesting(true);
    setSuggestionError(null);
    setIsScriptAiGenerated(false);
    try {
        const suggestion = await suggestConfig(endpoint.url);
        setEndpoint(prev => ({...prev, ...suggestion}));
        if (suggestion.customScript && suggestion.customScript.trim()) {
            setIsScriptAiGenerated(true);
        }
    } catch (error: any) {
        const errorMessage = error?.message || String(error);
        if (errorMessage.includes('API Key')) {
            setSuggestionError('The application API Key is invalid or missing.');
        } else if (errorMessage.includes('429') || errorMessage.toUpperCase().includes('RESOURCE_EXHAUSTED')) {
             setSuggestionError('AI quota exceeded. Please wait a moment and try again, or check your billing details.');
        } else {
             setSuggestionError('Failed to get suggestions. Please check the console for details.');
        }
    } finally {
        setIsSuggesting(false);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
        setEndpoint(prev => ({
            ...prev,
            ...template.config,
            name: prev.name, // Keep existing name and URL
            url: prev.url
        }));
    }
  };
  
  const handleScriptChange = (value: string) => {
      setIsScriptAiGenerated(false);
      handleChange('customScript', value);
  };
  
  const scriptPlaceholder = `// The 'apm' object is globally available in this script.
// apm.response contains the API response data.
// Use apm.test() to define test cases.

apm.test("Response contains user data", () => {
  const data = apm.response.json();
  apm.assert(data.user, "User object should exist");
  apm.assert(data.user.id === 123, "User ID should be 123");
});

apm.test("Content-Type header is correct", () => {
  const contentType = apm.response.headers['content-type'];
  apm.assert(contentType.includes('application/json'));
});
`;

  const isRest = endpoint.apiType === 'REST';
  const isGraphQL = endpoint.apiType === 'GraphQL';
  const isWebSocket = endpoint.apiType === 'WebSocket';
  const showBody = ['POST', 'PUT', 'PATCH'].some(m => endpoint.methods.includes(m as HttpMethod));

  return (
    <form onSubmit={handleSubmit} className="add-endpoint-form">
      <div className="form-header">
        <h2>Add New Endpoint</h2>
        {templates.length > 0 && (
            <div className="form-group template-selector">
                <select onChange={e => handleApplyTemplate(e.target.value)} defaultValue="">
                    <option value="" disabled>Apply a template...</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
        )}
      </div>

      <div className="form-group">
        <label>API Type</label>
        <div className="segmented-control">
            <button type="button" className={isRest ? 'active' : ''} onClick={() => handleChange('apiType', 'REST')}>REST</button>
            <button type="button" className={isGraphQL ? 'active' : ''} onClick={() => handleChange('apiType', 'GraphQL')}>GraphQL</button>
            <button type="button" className={isWebSocket ? 'active' : ''} onClick={() => handleChange('apiType', 'WebSocket')}>WebSocket</button>
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Endpoint Name</label>
          <input type="text" value={endpoint.name} onChange={e => handleChange('name', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Group</label>
          <input type="text" value={endpoint.group} onChange={e => handleChange('group', e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label>URL</label>
        <div className="url-input">
            <select value={endpoint.protocol} onChange={e => handleChange('protocol', e.target.value as Endpoint['protocol'])}>
                {isWebSocket ? (<><option value="wss">wss://</option><option value="ws">ws://</option></>) : (<><option value="https">https://</option><option value="http">http://</option></>)}
            </select>
            <input type="text" value={endpoint.url} onChange={e => { setSuggestionError(null); handleChange('url', e.target.value); }} required />
            {!isWebSocket && <button type="button" className="suggest-btn" onClick={handleSuggest} disabled={isSuggesting || !endpoint.url}>{isSuggesting ? <div className="spinner small" /> : <SparklesIcon />} Suggest</button>}
        </div>
        {suggestionError && <div className="form-error-message">{suggestionError}</div>}
      </div>
      
      <div className="form-config-tabs">
        <button type="button" className={activeTab === 'config' ? 'active' : ''} onClick={() => setActiveTab('config')}>Configuration</button>
        {!isWebSocket && <button type="button" className={activeTab === 'headers' ? 'active' : ''} onClick={() => setActiveTab('headers')}>Headers</button>}
        {!isWebSocket && (showBody || isGraphQL) && <button type="button" className={activeTab === 'body' ? 'active' : ''} onClick={() => setActiveTab('body')}>Body / Query</button>}
        {!isWebSocket && <button type="button" className={activeTab === 'script' ? 'active' : ''} onClick={() => setActiveTab('script')}><CodeBracketIcon/>Custom Script</button>}
      </div>

      <div className="form-tab-content">
        {activeTab === 'config' && (
            <>
                <div className="form-row">
                    {(isRest || isGraphQL) && (
                        <div className="form-group">
                            <label>HTTP Methods</label>
                            <div className="method-selector">
                                {(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as HttpMethod[]).map(m => (
                                    <button type="button" key={m} className={endpoint.methods.includes(m) ? 'active' : ''} onClick={() => handleMethodChange(m)} disabled={isGraphQL}>{m}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="form-group">
                        <label>Check Interval</label>
                        <select value={endpoint.interval} onChange={e => handleChange('interval', e.target.value as Endpoint['interval'])}>
                            <option value="fast">Fast (15s)</option><option value="normal">Normal (1m)</option><option value="slow">Slow (5m)</option>
                        </select>
                    </div>
                </div>

                {!isWebSocket && (
                  <div className="form-section">
                    <h3>Assertions</h3>
                    {endpoint.assertions.map((assertion, index) => (
                        <div className="form-row-dynamic" key={index}>
                        <select value={assertion.type} onChange={e => handleAssertionChange(index, 'type', e.target.value)}><option value="statusCode">Status Code</option></select>
                        <input type="text" placeholder="Value" value={assertion.value} onChange={e => handleAssertionChange(index, 'value', e.target.value)} />
                        </div>
                    ))}
                    {isGraphQL && <div className="form-tip">For GraphQL, the monitor also automatically checks for an 'errors' field in the response.</div>}
                  </div>
                )}
                
                 <div className="form-section">
                    <h3>Dependencies</h3>
                    <p className="form-tip">Select other endpoints that this endpoint calls. This will be visualized in the System Map.</p>
                    <div className="dependency-selector">
                        {allEndpoints.length > 0 ? allEndpoints.map(ep => (
                            <label key={ep.id} className="dependency-item">
                                <input type="checkbox" checked={(endpoint.dependencies || []).includes(ep.id)} onChange={() => handleDependencyChange(ep.id)}/>
                                {ep.name} <span className="dependency-group">({ep.group || 'Ungrouped'})</span>
                            </label>
                        )) : <p className="form-tip">No other endpoints exist to select as dependencies.</p>}
                    </div>
                </div>
                
                {!isWebSocket && (
                    <div className="form-section">
                        <h3>Plugins</h3>
                        {endpoint.plugins.map(plugin => (
                            <div key={plugin.id} className="plugin-config-container">
                                <div className="plugin-header"><h4>{PLUGIN_METADATA[plugin.type].name}</h4><button type="button" onClick={() => handleRemovePlugin(plugin.id)}>Remove</button></div>
                                {plugin.type === 'responseTimeSLA' && (<div className="form-row"><label>Max Latency (ms)</label><input type="number" value={plugin.config.maxLatency} onChange={e => handlePluginChange(plugin.id, { ...plugin.config, maxLatency: parseInt(e.target.value, 10) || 0 })}/></div>)}
                                {plugin.type === 'jsonAssertion' && (<><div className="form-group"><label>JSON Path (dot notation)</label><input type="text" placeholder="e.g., data.user.id" value={plugin.config.path} onChange={e => handlePluginChange(plugin.id, { ...plugin.config, path: e.target.value })}/></div><div className="form-row-dynamic"><select value={plugin.config.operator} onChange={e => handlePluginChange(plugin.id, { ...plugin.config, operator: e.target.value })}><option value="equals">equals</option><option value="notEquals">not equals</option><option value="contains">contains</option><option value="greaterThan">is greater than</option><option value="lessThan">is less than</option></select><input type="text" placeholder="Expected Value" value={plugin.config.value} onChange={e => handlePluginChange(plugin.id, { ...plugin.config, value: e.target.value })}/></div></>)}
                            </div>
                        ))}
                        <div className="add-plugin-controls">
                            <button type="button" className="add-btn" onClick={() => handleAddPlugin('responseTimeSLA')}>+ Add Response Time SLA</button>
                            <button type="button" className="add-btn" onClick={() => handleAddPlugin('jsonAssertion')}>+ Add JSON Content Assertion</button>
                        </div>
                    </div>
                )}
            </>
        )}
        {activeTab === 'headers' && !isWebSocket && (
             <div className="form-section standalone">
                <h3>Headers</h3>
                {endpoint.headers.map((header, index) => (
                    <div className="form-row-dynamic" key={index}>
                    <input type="text" placeholder="Key" value={header.key} onChange={e => handleHeaderChange(index, 'key', e.target.value)} />
                    <input type="text" placeholder="Value" value={header.value} onChange={e => handleHeaderChange(index, 'value', e.target.value)} />
                    <button type="button" onClick={() => handleRemoveHeader(index)}>Remove</button>
                    </div>
                ))}
                <button type="button" className="add-btn" onClick={handleAddHeader}>Add Header</button>
            </div>
        )}
        {activeTab === 'body' && !isWebSocket && (
             <div className="form-section standalone">
                {isGraphQL ? (
                    <>
                        <div className="form-group">
                            <label>GraphQL Query</label>
                            <textarea className="code-editor" placeholder={'query GetUsers {\n  users {\n    id\n    name\n  }\n}'} value={endpoint.body} onChange={e => handleChange('body', e.target.value)} rows={8}></textarea>
                        </div>
                        <div className="form-group">
                            <label>GraphQL Variables (JSON)</label>
                            <textarea className="code-editor" placeholder={'{ "limit": 10 }'} value={endpoint.variables} onChange={e => handleChange('variables', e.target.value)} rows={4}></textarea>
                        </div>
                    </>
                ) : showBody && (
                    <div className="form-group">
                        <label>Request Body (JSON)</label>
                        <textarea className="code-editor" value={endpoint.body} onChange={e => handleChange('body', e.target.value)} rows={12}></textarea>
                    </div>
                )}
             </div>
        )}
        {activeTab === 'script' && !isWebSocket && (
             <div className="form-section standalone">
                <h3>Custom Test Script</h3>
                <p className="form-tip">Write custom JavaScript to run assertions after the request is complete. Use `apm.test()` to define test cases and `apm.assert()` to make assertions.</p>
                <div className="form-group">
                    <textarea 
                        className="code-editor" 
                        value={endpoint.customScript} 
                        onChange={e => handleScriptChange(e.target.value)}
                        placeholder={scriptPlaceholder}
                        rows={12}
                    ></textarea>
                     {isScriptAiGenerated && (
                        <div className="ai-script-warning">
                            <WarningIcon />
                            <span><strong>AI-Generated Script:</strong> Please review this script carefully. AI can make mistakes. This code runs in a sandboxed environment, but you should always validate its logic before use.</span>
                        </div>
                    )}
                </div>
            </div>
        )}

      </div>
      
      <div className="form-actions">
        <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="submit-btn">Add Endpoint</button>
      </div>
    </form>
  );
};

const LatencyChart = ({ history, timeRange, performanceStats }: { history: HistoryItem[], timeRange: ChartTimeRange, performanceStats: { p95: number, p99: number} }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!Array.isArray(history) || history.length < 2 || !svgRef.current || !containerRef.current) return;

        const now = Date.now();
        const timeRanges = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            'all': history.length > 0 ? now - history[history.length - 1].timestamp : 0,
        };

        const timeWindow = timeRanges[timeRange];
        const cutoff = now - timeWindow;
        
        const filteredHistory = history.filter(h => h.timestamp >= cutoff).sort((a,b) => a.timestamp - b.timestamp);
        if (filteredHistory.length < 2) return;

        const svg = svgRef.current;
        const { width, height } = containerRef.current.getBoundingClientRect();
        const padding = { top: 10, right: 10, bottom: 20, left: 50 };
        const contentWidth = width - padding.left - padding.right;
        const contentHeight = height - padding.top - padding.bottom;

        const minTimestamp = Math.max(cutoff, filteredHistory[0].timestamp);
        const maxTimestamp = now;

        const maxLatency = Math.max(100, performanceStats.p99 * 1.2, ...filteredHistory.map(h => h.latency || 0));
        
        const xScale = (ts: number) => padding.left + ((ts - minTimestamp) / (maxTimestamp - minTimestamp)) * contentWidth;
        const yScale = (lat: number) => padding.top + contentHeight - (lat / maxLatency) * contentHeight;
        
        while (svg.lastChild) { svg.removeChild(svg.lastChild); }

        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        gradient.setAttribute("id", "area-gradient");
        gradient.setAttribute("x1", "0%");
        gradient.setAttribute("y1", "0%");
        gradient.setAttribute("x2", "0%");
        gradient.setAttribute("y2", "100%");
        const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop1.setAttribute("offset", "0%");
        stop1.setAttribute("stop-color", "var(--accent-color)");
        stop1.setAttribute("stop-opacity", "0.4");
        const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop2.setAttribute("offset", "100%");
        stop2.setAttribute("stop-color", "var(--accent-color)");
        stop2.setAttribute("stop-opacity", "0");
        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        svg.appendChild(defs);

        const numGridLines = 4;
        for (let i = 0; i <= numGridLines; i++) {
            const y = padding.top + (i / numGridLines) * contentHeight;
            const latencyValue = maxLatency * (1 - (i / numGridLines));

            const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            gridLine.setAttribute("x1", String(padding.left));
            gridLine.setAttribute("x2", String(width - padding.right));
            gridLine.setAttribute("y1", String(y));
            gridLine.setAttribute("y2", String(y));
            gridLine.setAttribute("class", "chart-grid-line");
            svg.appendChild(gridLine);

            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", String(padding.left - 8));
            label.setAttribute("y", String(y + 4));
            label.setAttribute("class", "chart-y-axis-label");
            label.textContent = `${latencyValue.toFixed(0)}`;
            svg.appendChild(label);
        }

        const createThresholdLine = (value: number, label: string, className: string) => {
            if (value > 0 && value < maxLatency) {
                const y = yScale(value);
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", String(padding.left));
                line.setAttribute("x2", String(width - padding.right));
                line.setAttribute("y1", String(y));
                line.setAttribute("y2", String(y));
                line.setAttribute("class", `chart-threshold-line ${className}`);
                svg.appendChild(line);

                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", String(width - padding.right - 5));
                text.setAttribute("y", String(y - 4));
                text.setAttribute("class", `chart-threshold-label ${className}`);
                text.textContent = `${label} (${value.toFixed(0)}ms)`;
                svg.appendChild(text);
            }
        };

        createThresholdLine(performanceStats.p95, 'P95', 'p95');
        createThresholdLine(performanceStats.p99, 'P99', 'p99');

        const pathData = filteredHistory.map(h => `${xScale(h.timestamp)},${yScale(h.latency || 0)}`).join(' L ');
        const areaData = `M ${xScale(filteredHistory[0].timestamp)},${yScale(filteredHistory[0].latency || 0)} L ${pathData} L ${xScale(maxTimestamp)},${height - padding.bottom} L ${xScale(minTimestamp)},${height - padding.bottom} Z`;
        
        const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
        area.setAttribute("d", areaData);
        area.setAttribute("class", "chart-area");
        svg.appendChild(area);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
        line.setAttribute("d", `M ${pathData}`);
        line.setAttribute("class", "chart-line");
        svg.appendChild(line);

        filteredHistory.forEach(h => {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", String(xScale(h.timestamp)));
            circle.setAttribute("cy", String(yScale(h.latency || 0)));
            circle.setAttribute("r", "3");
            circle.setAttribute("class", h.success ? "chart-dot-success" : "chart-dot-failure");
            svg.appendChild(circle);
        });

        const tooltip = document.createElement("div");
        tooltip.className = "chart-tooltip";
        containerRef.current.appendChild(tooltip);

        const verticalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        verticalLine.setAttribute("class", "chart-tooltip-line");
        verticalLine.setAttribute("y1", String(padding.top));
        verticalLine.setAttribute("y2", String(height - padding.bottom));
        verticalLine.style.visibility = "hidden";
        svg.appendChild(verticalLine);
        
        const onMouseMove = (event: MouseEvent) => {
            const rect = svg.getBoundingClientRect();
            const x = event.clientX - rect.left;
            
            const closestPoint = filteredHistory.reduce((prev, curr) => {
                return (Math.abs(xScale(curr.timestamp) - x) < Math.abs(xScale(prev.timestamp) - x) ? curr : prev);
            });

            if (closestPoint) {
                const cx = xScale(closestPoint.timestamp);
                const cy = yScale(closestPoint.latency || 0);

                verticalLine.setAttribute("x1", String(cx));
                verticalLine.setAttribute("x2", String(cx));
                verticalLine.style.visibility = "visible";

                tooltip.style.visibility = "visible";
                tooltip.style.left = `${cx}px`;
                tooltip.style.top = `${cy}px`;
                tooltip.innerHTML = `
                    <div><strong>${new Date(closestPoint.timestamp).toLocaleString()}</strong></div>
                    <div>Method: <strong>${closestPoint.method}</strong></div>
                    <div>Latency: <strong>${closestPoint.latency || 'N/A'} ms</strong></div>
                    <div>Status: <strong class="${closestPoint.success ? 'status-up' : 'status-down'}">${closestPoint.success ? 'Up' : 'Down'}</strong></div>
                `;
            }
        };

        const onMouseLeave = () => {
            tooltip.style.visibility = "hidden";
            verticalLine.style.visibility = "hidden";
        };

        svg.addEventListener('mousemove', onMouseMove);
        svg.addEventListener('mouseleave', onMouseLeave);

        return () => {
            svg.removeEventListener('mousemove', onMouseMove);
            svg.removeEventListener('mouseleave', onMouseLeave);
            if(containerRef.current) {
                const existingTooltip = containerRef.current.querySelector('.chart-tooltip');
                if (existingTooltip) {
                    containerRef.current.removeChild(existingTooltip);
                }
            }
        };

    }, [history, timeRange, performanceStats]);

    return (
        <div ref={containerRef} className="chart-container">
            {history.length < 2 && <div className="chart-placeholder">Not enough data to display chart.</div>}
            <svg ref={svgRef} width="100%" height="100%"></svg>
        </div>
    );
};

const AIAnalysisDisplay = ({ analysis }: { analysis: AIAnalysisResult }) => {
    const statusInfo = {
        HEALTHY: { text: "Healthy", className: "status-tag-healthy" },
        DEGRADED: { text: "Degraded", className: "status-tag-degraded" },
        UNSTABLE: { text: "Unstable", className: "status-tag-unstable" },
        FAILURE: { text: "Failure", className: "status-tag-failure" },
        UNKNOWN: { text: "Unknown", className: "status-tag-unknown" },
    };

    const { text, className } = statusInfo[analysis.status] || statusInfo.UNKNOWN;

    const TrendIcon = ({ trend }: { trend?: 'UP' | 'DOWN' | 'NEUTRAL' }) => {
        if (trend === 'UP') return <ArrowTrendingUpIcon className="trend-up" />;
        if (trend === 'DOWN') return <ArrowTrendingDownIcon className="trend-down" />;
        return null;
    };

    return (
        <div className="ai-analysis-display">
            <div className="ai-analysis-header">
                <h3>SRE Analysis</h3>
                <span className={`status-tag ${className}`}>{text}</span>
            </div>
            <p className="ai-summary"><em>{analysis.summary}</em></p>

            {analysis.keyMetrics.length > 0 && (
                 <div className="ai-metrics-grid">
                    {analysis.keyMetrics.map((metric, i) => (
                        <div key={i} className="ai-metric-card">
                            <div className="metric-name">{metric.name}</div>
                            <div className="metric-value">
                                {metric.value}
                                <TrendIcon trend={metric.trend} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {analysis.incidentAnalysis?.text && (
                 <div className="ai-section">
                    <h4><WarningIcon /> Incident Analysis</h4>
                    <p>{analysis.incidentAnalysis.text}</p>
                </div>
            )}
            
            <div className="ai-columns">
                {analysis.strengths.length > 0 && (
                    <div className="ai-section">
                        <h4><CheckIcon /> Strengths</h4>
                        <ul>{analysis.strengths.map((item, i) => <li key={i}>{item.text}</li>)}</ul>
                    </div>
                )}
                {analysis.weaknesses.length > 0 && (
                    <div className="ai-section">
                        <h4><XCircleIcon /> Weaknesses</h4>
                        <ul>{analysis.weaknesses.map((item, i) => <li key={i}>{item.text}</li>)}</ul>
                    </div>
                )}
            </div>
            {analysis.recommendations.length > 0 && (
                <div className="ai-section">
                    <h4><LightBulbIcon /> SRE Recommendations</h4>
                    <ul>{analysis.recommendations.map((item, i) => <li key={i}>{item.text}</li>)}</ul>
                </div>
            )}
        </div>
    );
};

const GlobalDashboard = ({ endpoints, history, onSelectEndpoint, onAutoSetup, onShowAddForm }: { endpoints: Endpoint[]; history: HistoryItem[]; onSelectEndpoint: (id: string) => void; onAutoSetup: () => void; onShowAddForm: () => void; }) => {
    const summary = useMemo(() => {
        const now = Date.now();
        const last24h = now - 24 * 60 * 60 * 1000;
        let up = 0, down = 0, degraded = 0;

        endpoints.forEach(e => {
            const endpointHistory = history.filter(h => h.endpointId === e.id);
            if (endpointHistory.length === 0) return;

            const latestTimestamp = Math.max(...endpointHistory.map(h => h.timestamp));
            const latestChecks = endpointHistory.filter(h => h.timestamp === latestTimestamp);

            if (!latestChecks.every(c => c.success)) {
                down++;
                return;
            }

            const history24h = endpointHistory.filter(h => h.timestamp > last24h);
            const latencies24h = history24h.map(h => h.latency || 0);
            if (latencies24h.length > 5) {
                const mean = latencies24h.reduce((a, b) => a + b, 0) / latencies24h.length;
                const stdDev = Math.sqrt(latencies24h.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / latencies24h.length);
                const currentAvgLatency = latestChecks.reduce((sum, c) => sum + (c.latency || 0), 0) / latestChecks.length;
                
                if (currentAvgLatency > mean + 2 * stdDev) {
                    degraded++;
                    return;
                }
            }
            up++;
        });

        const totalUptime = endpoints.map(e => {
            const endpointHistory = history.filter(h => h.endpointId === e.id && h.timestamp > last24h);
            if (endpointHistory.length === 0) return 100;
            const successCount = endpointHistory.filter(h => h.success).length;
            return (successCount / endpointHistory.length) * 100;
        }).reduce((acc, val) => acc + val, 0) / (endpoints.length || 1);

        return { up, down, degraded, totalUptime };
    }, [endpoints, history]);

    const groupedEndpoints = useMemo(() => {
        return endpoints.reduce((acc, endpoint) => {
            const groupName = endpoint.group || 'Ungrouped';
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(endpoint);
            return acc;
        }, {} as Record<string, Endpoint[]>);
    }, [endpoints]);

    const renderSparkline = (endpointId: string) => {
        const endpointHistory = history.filter(h => h.endpointId === endpointId).slice(0, 20);
        if (endpointHistory.length < 2) return <div className="sparkline-placeholder"></div>;

        const width = 100, height = 20;
        const maxLatency = Math.max(...endpointHistory.map(h => h.latency || 0));
        const pathData = endpointHistory.map((h, i) => 
            `${(i / (endpointHistory.length - 1)) * width},${height - ((h.latency || 0) / maxLatency) * height}`
        ).join(' L ');
        
        return <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"><path d={`M ${pathData}`} /></svg>;
    };

    if (endpoints.length === 0) {
        return (
            <div className="dashboard-empty-state">
                <div className="empty-state-content">
                    <ChartBarIcon />
                    <h2>Welcome to API Monitor Pro</h2>
                    <p>You haven't added any endpoints yet. Get started by adding one manually or using our AI-powered auto-setup.</p>
                    <div className="empty-state-actions">
                        <button className="setup-btn primary" onClick={onAutoSetup}>
                            <SparklesIcon /> Auto-setup with AI
                        </button>
                        <button className="setup-btn" onClick={onShowAddForm}>
                            <PlusIcon /> Add Endpoint Manually
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="global-dashboard">
            <h2>System Health Overview</h2>
            <div className="summary-cards">
                <div className="summary-card">
                    <h4>Total Endpoints</h4>
                    <div className="value">{endpoints.length}</div>
                </div>
                <div className="summary-card">
                    <h4>Overall Uptime (24h)</h4>
                    <div className={`value ${summary.totalUptime > 95 ? 'status-up' : 'status-down'}`}>{summary.totalUptime.toFixed(2)}%</div>
                </div>
                <div className="summary-card">
                    <div className="status-counts">
                        <div className="status-count status-up"><CheckCircleIcon /> Up: {summary.up}</div>
                        <div className="status-count status-down"><XCircleIcon /> Down: {summary.down}</div>
                        <div className="status-count status-degraded"><ExclamationTriangleIcon /> Degraded: {summary.degraded}</div>
                    </div>
                </div>
            </div>
            <div className="endpoint-grid">
                {Object.entries(groupedEndpoints).map(([group, endpointsInGroup]) => (
                    <div key={group} className="endpoint-group">
                        <h3>{group}</h3>
                        <div className="group-grid">
                            {endpointsInGroup.map(endpoint => {
                                const endpointHistory = history.filter(h => h.endpointId === endpoint.id);
                                
                                let latestChecks: HistoryItem[] = [];
                                if (endpointHistory.length > 0) {
                                    const latestTimestamp = Math.max(...endpointHistory.map(h => h.timestamp));
                                    latestChecks = endpointHistory.filter(h => h.timestamp === latestTimestamp);
                                }
                                
                                const isUp = latestChecks.length > 0 ? latestChecks.every(c => c.success) : true;
                                const statusClass = latestChecks.length === 0 ? 'status-unknown' : isUp ? 'status-up' : 'status-down';

                                const uptime24h = endpointHistory.filter(h => h.timestamp > Date.now() - 24 * 60 * 60 * 1000);
                                const uptime = uptime24h.length ? (uptime24h.filter(h => h.success).length / uptime24h.length) * 100 : 100;
                                const avgLatency = uptime24h.length ? uptime24h.reduce((sum, h) => sum + (h.latency || 0), 0) / uptime24h.length : 0;
                                
                                return (
                                    <div key={endpoint.id} className="endpoint-card" onClick={() => onSelectEndpoint(endpoint.id)}>
                                        <div className="card-header">
                                            <span className={`status-dot ${statusClass}`}></span>
                                            <h4>{endpoint.name}</h4>
                                        </div>
                                        <div className="card-metrics">
                                            <div className="metric">
                                                <span>Uptime (24h)</span>
                                                <strong>{uptime.toFixed(2)}%</strong>
                                            </div>
                                            <div className="metric">
                                                <span>Avg Latency</span>
                                                <strong>{avgLatency.toFixed(0)} ms</strong>
                                            </div>
                                        </div>
                                        <div className="card-sparkline">
                                            {renderSparkline(endpoint.id)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HistoryLogItem: React.FC<{ item: HistoryItem; devMode: boolean; }> = ({ item, devMode }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const hasDetails = (item.pluginResults && item.pluginResults.length > 0) || (item.scriptResults && item.scriptResults.length > 0) || item.responseBody || (devMode && (item.requestHeaders || item.responseHeaders));
    const detailsId = `log-details-${item.id}`;

    const formattedBody = useMemo(() => {
        if (!item.responseBody) return null;
        try {
            const parsed = JSON.parse(item.responseBody.replace('... (truncated)', ''));
            return JSON.stringify(parsed, null, 2);
        } catch (e) {
            return item.responseBody;
        }
    }, [item.responseBody]);
    
    const scriptSummary = useMemo(() => {
        if (!item.scriptResults || item.scriptResults.length === 0) return null;
        const passed = item.scriptResults.filter(r => r.success).length;
        const total = item.scriptResults.length;
        const allPassed = passed === total;
        return <span className={`script-summary-badge ${allPassed ? 'status-up' : 'status-down'}`}>{`Tests: ${passed}/${total}`}</span>
    }, [item.scriptResults]);

    return (
        <div className="log-item">
            <button
                type="button"
                className="log-main-row"
                onClick={() => hasDetails && setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
                aria-controls={detailsId}
                disabled={!hasDetails}
            >
                <div className="log-status">
                    {item.success ? <CheckCircleIcon className="status-up" /> : <XCircleIcon className="status-down" />}
                </div>
                <div className="log-details">
                    <strong>{new Date(item.timestamp).toLocaleString()}</strong>
                    <span className={`log-method method-badge method-${item.method.toLowerCase()}`}>{item.method}</span>
                    <span>Status: {item.statusCode || 'N/A'}</span>
                    <span>Latency: {item.latency != null ? `${item.latency} ms` : 'N/A'}</span>
                    {scriptSummary}
                    {item.error && <span className="error-text">Error: {item.error}</span>}
                </div>
                {hasDetails && (
                    <div className="log-expand-control">
                        <span className={`expand-indicator ${isExpanded ? 'expanded' : ''}`}>
                            <ChevronDownIcon />
                        </span>
                    </div>
                )}
            </button>
            {isExpanded && hasDetails && (
                <div id={detailsId} className="log-expanded-details">
                    {devMode && item.requestHeaders && (
                        <div className="log-headers">
                            <h4>Request Headers</h4>
                            <pre><code>{JSON.stringify(item.requestHeaders, null, 2)}</code></pre>
                        </div>
                    )}
                     {devMode && item.responseHeaders && (
                        <div className="log-headers">
                            <h4>Response Headers</h4>
                            <pre><code>{JSON.stringify(item.responseHeaders, null, 2)}</code></pre>
                        </div>
                    )}
                    {item.pluginResults && item.pluginResults.length > 0 && (
                        <div className="log-plugins-details">
                            <h4>Plugin Results</h4>
                            {item.pluginResults.map(result => (
                                <div key={result.pluginId} className="plugin-result">
                                    {result.success ? <CheckCircleIcon className="status-up" /> : <XCircleIcon className="status-down" />}
                                    <span><strong>{result.name}:</strong> {result.message}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {item.scriptResults && item.scriptResults.length > 0 && (
                        <div className="log-plugins-details">
                             <h4>Custom Script Test Results</h4>
                             {item.scriptResults.map((result, i) => (
                                <div key={i} className="plugin-result">
                                    {result.success ? <CheckCircleIcon className="status-up" /> : <XCircleIcon className="status-down" />}
                                    <span><strong>{result.name}:</strong> {result.success ? 'Passed' : <span className="error-text">{result.error}</span>}</span>
                                </div>
                             ))}
                        </div>
                    )}
                    {item.responseBody && (
                        <div className="log-response-body">
                            <h4>Response Body</h4>
                            <pre><code>{formattedBody}</code></pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const HistoryLogSummary = ({ history }: { history: HistoryItem[] }) => {
    const summary = useMemo(() => {
        if (history.length === 0) return null;
        const successCount = history.filter(h => h.success).length;
        const successRate = (successCount / history.length) * 100;
        const avgLatency = history.reduce((sum, h) => sum + (h.latency || 0), 0) / history.length;
        return { successRate, avgLatency };
    }, [history]);

    if (!summary) return null;

    return (
        <div className="history-log-summary">
            <span>Showing {history.length} checks</span>
            <span>Success Rate: <strong className={summary.successRate > 95 ? 'status-up' : 'status-down'}>{summary.successRate.toFixed(2)}%</strong></span>
            <span>Avg Latency: <strong>{summary.avgLatency.toFixed(0)} ms</strong></span>
        </div>
    );
}

const BenchmarkConfigModal = ({ onRun, onCancel, defaultConfig }: { onRun: (config: BenchmarkConfig) => void, onCancel: () => void, defaultConfig: BenchmarkConfig }) => {
    const [config, setConfig] = useState(defaultConfig);

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Configure Benchmark Test</h2>
                <p className="modal-warning">
                    <WarningIcon /> Client-side benchmarks are subject to browser and network limitations. For high-accuracy load testing, use dedicated tools.
                </p>
                <div className="form-group">
                    <label>Virtual Users (Concurrency: {config.virtualUsers})</label>
                    <input
                        type="range"
                        min="1"
                        max="100"
                        value={config.virtualUsers}
                        onChange={e => setConfig(c => ({...c, virtualUsers: parseInt(e.target.value)}))}
                    />
                </div>
                <div className="form-group">
                    <label>Duration (Seconds: {config.duration}s)</label>
                    <input
                        type="range"
                        min="5"
                        max="120"
                        step="5"
                        value={config.duration}
                        onChange={e => setConfig(c => ({...c, duration: parseInt(e.target.value)}))}
                    />
                </div>
                <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
                    <button type="button" className="submit-btn" onClick={() => onRun(config)}>
                        <BeakerIcon /> Start Test
                    </button>
                </div>
            </div>
        </div>
    );
};

const BenchmarkRunner = ({ progress, liveResults, onCancel }: { progress: number; liveResults: { rps: number; avgLatency: number; errors: number; }; onCancel: () => void; }) => (
    <div className="benchmark-runner">
        <h4>Test in Progress...</h4>
        <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            <span>{progress.toFixed(0)}%</span>
        </div>
        <div className="live-metrics">
            <div>
                <span className="label">Requests/sec</span>
                <span className="value">{liveResults.rps.toFixed(1)}</span>
            </div>
            <div>
                <span className="label">Avg. Latency</span>
                <span className="value">{liveResults.avgLatency.toFixed(0)} ms</span>
            </div>
            <div>
                <span className="label">Errors</span>
                <span className="value status-down">{liveResults.errors}</span>
            </div>
        </div>
        <button className="cancel-btn" onClick={onCancel}>Cancel Test</button>
    </div>
);

const BenchmarkResultDisplay = ({ result, previousResult }: { result: BenchmarkResult, previousResult?: BenchmarkResult | null }) => {
    const MetricDelta = ({ current, previous }: { current: number, previous: number }) => {
        if (previous === 0) return null;
        const delta = current - previous;
        const percentChange = (delta / previous) * 100;
        const isImprovement = delta < 0; // Lower latency is better
        
        return (
            <span className={`metric-delta ${isImprovement ? 'status-up' : 'status-down'}`}>
                {isImprovement ? <ArrowTrendingDownIcon/> : <ArrowTrendingUpIcon/> }
                {delta.toFixed(0)}ms ({percentChange.toFixed(1)}%)
            </span>
        );
    };

    return (
    <div className="benchmark-result-display">
        <h4>Benchmark Results <span className="timestamp">{new Date(result.timestamp).toLocaleString()}</span></h4>
        <div className="result-summary-grid">
            <div className="summary-card"><h5>Reqs/sec</h5><div className="value">{result.metrics.requestsPerSecond.toFixed(2)}</div></div>
            <div className="summary-card"><h5>Avg. Latency</h5>
                <div className="value">{result.metrics.averageLatency.toFixed(0)} ms</div>
                {previousResult && <MetricDelta current={result.metrics.averageLatency} previous={previousResult.metrics.averageLatency} />}
            </div>
            <div className="summary-card"><h5>P95 Latency</h5>
                <div className="value">{result.metrics.p95Latency.toFixed(0)} ms</div>
                {previousResult && <MetricDelta current={result.metrics.p95Latency} previous={previousResult.metrics.p95Latency} />}
            </div>
            <div className="summary-card"><h5>Success Rate</h5><div className={`value ${result.metrics.successRate >= 99 ? 'status-up' : 'status-down'}`}>{result.metrics.successRate.toFixed(2)}%</div></div>
        </div>
        <details className="result-details">
            <summary>View All Metrics</summary>
            <ul>
                <li><strong>Configuration:</strong> {result.config.virtualUsers} users for {result.config.duration}s</li>
                <li><strong>Total Requests:</strong> {result.metrics.totalRequests}</li>
                <li><strong>Successful Requests:</strong> {result.metrics.successfulRequests}</li>
                <li><strong>Failed Requests:</strong> {result.metrics.failedRequests}</li>
                <li><strong>P99 Latency:</strong> {result.metrics.p99Latency} ms</li>
            </ul>
        </details>
    </div>
    )
};

const BenchmarkHistoryItem: React.FC<{ result: BenchmarkResult; onSelect: () => void; isActive: boolean }> = ({ result, onSelect, isActive }) => (
    <div className={`benchmark-history-item ${isActive ? 'active' : ''}`} onClick={onSelect}>
        <div className="history-item-header">
            <strong>{new Date(result.timestamp).toLocaleString()}</strong>
            <span className={`value ${result.metrics.successRate >= 99 ? 'status-up' : 'status-down'}`}>
                {result.metrics.successRate.toFixed(2)}% Success
            </span>
        </div>
        <div className="history-item-metrics">
            <div><span>Reqs/sec</span><strong>{result.metrics.requestsPerSecond.toFixed(2)}</strong></div>
            <div><span>Avg Latency</span><strong>{result.metrics.averageLatency.toFixed(0)} ms</strong></div>
            <div><span>P95 Latency</span><strong>{result.metrics.p95Latency.toFixed(0)} ms</strong></div>
        </div>
    </div>
);

const BenchmarkView = ({ endpoint, benchmarkHistory, onSaveResult }: { endpoint: Endpoint; benchmarkHistory: BenchmarkResult[]; onSaveResult: (result: BenchmarkResult) => void; }) => {
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [isBenchmarking, setIsBenchmarking] = useState(false);
    const [progress, setProgress] = useState(0);
    const [liveResultsDisplay, setLiveResultsDisplay] = useState({ rps: 0, avgLatency: 0, errors: 0 });
    const [selectedResult, setSelectedResult] = useState<BenchmarkResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [wasCancelled, setWasCancelled] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleRunBenchmark = async (config: BenchmarkConfig) => {
        setIsConfiguring(false);
        setIsBenchmarking(true);
        setProgress(0);
        setLiveResultsDisplay({ rps: 0, avgLatency: 0, errors: 0 });
        setSelectedResult(null);
        setError(null);
        setWasCancelled(false);

        abortControllerRef.current = new AbortController();

        try {
            const result = await runBenchmark(endpoint, config, (prog, live) => {
                setProgress(prog);
                setLiveResultsDisplay(live);
            }, abortControllerRef.current.signal);
            
            onSaveResult(result);
            setSelectedResult(result);
        } catch (err: any) {
            if (err.name === 'AbortError') {
                setWasCancelled(true);
            } else {
                console.error("Benchmark failed:", err);
                setError(`Test failed: ${err.message || 'An unknown error occurred.'}`);
            }
        } finally {
            setIsBenchmarking(false);
        }
    };

    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };
    
    useEffect(() => {
        setSelectedResult(benchmarkHistory[0] || null);
        setError(null);
        setWasCancelled(false);
    }, [benchmarkHistory, endpoint.id]);

    const previousResult = useMemo(() => {
        if (!selectedResult) return null;
        const currentIndex = benchmarkHistory.findIndex(r => r.id === selectedResult.id);
        return benchmarkHistory[currentIndex + 1] || null;
    }, [selectedResult, benchmarkHistory]);


    return (
        <div className="benchmark-view">
            {isConfiguring && <BenchmarkConfigModal onRun={handleRunBenchmark} onCancel={() => setIsConfiguring(false)} defaultConfig={DEFAULT_BENCHMARK_CONFIG}/>}
            
            <div className="benchmark-grid">
                <div className="card benchmark-main-panel">
                    <div className="benchmark-header">
                        <h3><BeakerIcon /> Load & Benchmark Testing</h3>
                        <button onClick={() => setIsConfiguring(true)} disabled={isBenchmarking}>
                            Run New Test
                        </button>
                    </div>
                    
                    {isBenchmarking ? (
                        <BenchmarkRunner progress={progress} liveResults={liveResultsDisplay} onCancel={handleCancel} />
                    ) : error ? (
                        <div className="benchmark-error-display">
                            <h4><XCircleIcon /> Test Failed</h4>
                            <p>{error}</p>
                        </div>
                    ) : wasCancelled ? (
                         <p className="placeholder-text">The benchmark test was canceled.</p>
                    ) : selectedResult ? (
                        <BenchmarkResultDisplay result={selectedResult} previousResult={previousResult} />
                    ) : (
                        <p className="placeholder-text">No benchmark has been run for this endpoint yet. Run a new test to see performance metrics.</p>
                    )}
                </div>

                <div className="card benchmark-history-panel">
                    <h3>Benchmark History</h3>
                    <div className="benchmark-history-log">
                        {benchmarkHistory.length === 0 && <p className="placeholder-text">No past results.</p>}
                        {benchmarkHistory.map(result => (
                            <BenchmarkHistoryItem
                                key={result.id}
                                result={result} 
                                onSelect={() => setSelectedResult(result)}
                                isActive={selectedResult?.id === result.id}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const EndpointView = ({ endpoint, history, benchmarkHistory, onDelete, onUpdate, onRegenerateToken, onSaveBenchmarkResult, devMode }: { 
    endpoint: Endpoint; 
    history: HistoryItem[];
    benchmarkHistory: BenchmarkResult[];
    onDelete: (id: string) => void; 
    onUpdate: (endpoint: Endpoint) => void; 
    onRegenerateToken: (id: string) => void; 
    onSaveBenchmarkResult: (endpointId: string, result: BenchmarkResult) => void;
    devMode: boolean;
}) => {
    const [aiAnalysis, setAIAnalysis] = useState<AIAnalysisResult>(INITIAL_AI_ANALYSIS);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [chartTimeRange, setChartTimeRange] = useState<ChartTimeRange>('24h');
    const [isCopied, setIsCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'monitoring' | 'benchmarking'>('monitoring');
    
    const { latestChecks, overallStatus } = useMemo(() => {
        if (history.length === 0) return { latestChecks: [], overallStatus: 'pending' };
        const latestTimestamp = Math.max(...history.map(h => h.timestamp));
        const checks = history.filter(h => h.timestamp === latestTimestamp);
        const status = checks.every(c => c.success) ? 'up' : 'down';
        return { latestChecks: checks, overallStatus: status };
    }, [history]);

    const handleRunAnalysis = async () => {
        setIsAnalyzing(true);
        const result = await runDeepDiveAnalysis(endpoint, history);
        setAIAnalysis(result);
        setIsAnalyzing(false);
    };

    const webhookUrl = `https://api-monitor.dev/webhook/check?id=${endpoint.id}&token=${endpoint.webhookToken}`;

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(webhookUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    useEffect(() => {
        setAIAnalysis(INITIAL_AI_ANALYSIS);
        setActiveTab('monitoring');
    }, [endpoint.id]);

    const generateCurlForEndpoint = () => {
        const method = endpoint.apiType === 'GraphQL' ? 'POST' : endpoint.methods[0] || 'GET';
        let curl = `curl -X ${method} "${endpoint.protocol}://${endpoint.url}"`;
        
        const headers = [...endpoint.headers];
        if ((endpoint.apiType === 'GraphQL' || (['POST', 'PUT', 'PATCH'].includes(method) && endpoint.body)) && !headers.some(h => h.key.toLowerCase() === 'content-type')) {
            headers.push({ key: 'Content-Type', value: 'application/json' });
        }

        headers.forEach(h => {
            if (h.key) {
                curl += ` \\\n  -H '${h.key}: ${h.value}'`;
            }
        });

        if (endpoint.apiType === 'GraphQL') {
            try {
                const variables = endpoint.variables ? JSON.parse(endpoint.variables) : {};
                const body = { query: endpoint.body, variables };
                curl += ` \\\n  -d '${JSON.stringify(body, null, 2)}'`;
            } catch (e) {
                curl += ` \\\n  -d '{"query": "${endpoint.body.replace(/\s+/g, ' ')}", "variables": { /* Invalid JSON */ }}'`;
            }
        } else if (['POST', 'PUT', 'PATCH'].includes(method) && endpoint.body) {
            curl += ` \\\n  -d '${endpoint.body}'`;
        }
        return curl;
    };

    const performanceStats = useMemo(() => {
        const last24h = history.filter(h => h.timestamp > Date.now() - 24 * 60 * 60 * 1000);
        if (last24h.length === 0) return { uptime: 100, avgLatency: 0, p95: 0, p99: 0 };
        const uptime = (last24h.filter(h => h.success).length / last24h.length) * 100;
        const latencies = last24h.filter(h => h.success).map(h => h.latency || 0).sort((a, b) => a - b);
        if (latencies.length === 0) return { uptime, avgLatency: 0, p95: 0, p99: 0 };
        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
        const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
        return { uptime, avgLatency, p95, p99 };
    }, [history]);
    
    let statusIcon, statusText, statusClass;
    switch (overallStatus) {
        case 'up':
            statusIcon = <CheckCircleIcon />; statusText = 'Up'; statusClass = 'up';
            break;
        case 'down':
            statusIcon = <XCircleIcon />; statusText = 'Down'; statusClass = 'down';
            break;
        default:
            statusIcon = <ClockIcon />; statusText = 'Pending'; statusClass = 'pending';
    }
    
    return (
        <div className="endpoint-view">
            <header className="endpoint-header">
                <div className="endpoint-title">
                    <span className={`status-icon status-${statusClass}`}>{statusIcon}</span>
                    <div>
                        <h2>{endpoint.name}</h2>
                        <div className="endpoint-meta">
                            <p>{`${endpoint.protocol}://${endpoint.url}`}</p>
                            <div className="method-badges">
                                { endpoint.apiType === 'GraphQL' && <span className="api-type-badge graphql">GraphQL</span> }
                                { endpoint.apiType === 'WebSocket' && <span className="api-type-badge websocket">WebSocket</span> }
                                { endpoint.apiType === 'REST' && endpoint.methods.map(m => <span key={m} className={`method-badge method-${m.toLowerCase()}`}>{m}</span>)}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="endpoint-actions">
                    <button onClick={() => onDelete(endpoint.id)} className="delete-btn">Delete</button>
                </div>
            </header>
            
            <div className="endpoint-tabs">
                <button className={activeTab === 'monitoring' ? 'active' : ''} onClick={() => setActiveTab('monitoring')}>
                    <ChartBarIcon /> Health Monitoring
                </button>
                <button className={activeTab === 'benchmarking' ? 'active' : ''} onClick={() => setActiveTab('benchmarking')}>
                    <BeakerIcon /> Benchmarking
                </button>
            </div>

            {activeTab === 'monitoring' && (
              <>
                <div className="endpoint-summary-cards">
                    <div className="summary-card"><h4>Status</h4><div className={`value status-${statusClass}`}>{statusText}</div></div>
                    <div className="summary-card"><h4>Uptime (24h)</h4><div className="value">{performanceStats.uptime.toFixed(2)}%</div></div>
                    <div className="summary-card"><h4>Avg Latency (24h)</h4><div className="value">{performanceStats.avgLatency.toFixed(0)} ms</div></div>
                    <div className="summary-card"><h4>P95 Latency (24h)</h4><div className="value">{performanceStats.p95.toFixed(0)} ms</div></div>
                </div>

                <div className="card trends-card">
                    <div className="trends-header">
                        <h3>Performance Trends</h3>
                        <div className="time-range-selector">
                            {(['1h', '24h', '7d', 'all'] as ChartTimeRange[]).map(range => (
                                <button key={range} className={chartTimeRange === range ? 'active' : ''} onClick={() => setChartTimeRange(range)}>
                                    {range.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <LatencyChart history={history} timeRange={chartTimeRange} performanceStats={performanceStats} />
                </div>

                <div className="endpoint-details-grid">
                    <div className="card ai-insight-card">
                        <div className="ai-insight-header">
                            <h3><SparklesIcon /> AI Co-Pilot</h3>
                            <button onClick={handleRunAnalysis} disabled={isAnalyzing}>
                                {isAnalyzing ? <><div className="spinner small-light"/>Analyzing...</> : 'Run Deep Dive'}
                            </button>
                        </div>
                        {isAnalyzing ? (
                            <div className="skeleton-loader">
                                <div className="skeleton-line" style={{width: '30%'}}></div>
                                <div className="skeleton-line" style={{width: '80%'}}></div>
                                <div className="skeleton-line" style={{width: '60%'}}></div>
                                <div className="skeleton-line" style={{width: '70%'}}></div>
                            </div>
                        ) : (
                            <AIAnalysisDisplay analysis={aiAnalysis} />
                        )}
                    </div>

                    <div className="card cicd-card">
                        <h3><LinkIcon /> CI/CD & Developer Info</h3>
                        <p>Trigger a real-time health check for this endpoint from your CI/CD pipeline after a deployment.</p>
                        
                        <div className="webhook-display">
                            <label>Webhook URL</label>
                            <div className="webhook-url-container">
                                <input type="text" readOnly value={webhookUrl} />
                                <button onClick={handleCopyUrl} title="Copy URL">
                                    {isCopied ? <CheckIcon /> : <ClipboardIcon />}
                                </button>
                            </div>
                        </div>

                        <div className="cicd-actions">
                            <button onClick={() => onRegenerateToken(endpoint.id)}>
                                <RefreshIcon /> Regenerate Token
                            </button>
                        </div>

                        <div className="example-usage">
                            <label>Webhook Usage (cURL)</label>
                            <pre><code>{`curl -X POST "${webhookUrl}"`}</code></pre>
                            <p>A successful check will return HTTP 200 with results. A failed check will return HTTP 500.</p>
                        </div>

                        {devMode && (
                            <div className="example-usage dev-mode-feature">
                                <label>Example cURL for Endpoint</label>
                                <pre><code>{generateCurlForEndpoint()}</code></pre>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <HistoryLogSummary history={history} />
                    <div className="history-log">
                        {history.map(item => <HistoryLogItem key={item.id} item={item} devMode={devMode} />)}
                    </div>
                </div>
              </>
            )}
            
            {activeTab === 'benchmarking' && (
                <BenchmarkView
                    endpoint={endpoint}
                    benchmarkHistory={benchmarkHistory}
                    onSaveResult={(result) => onSaveBenchmarkResult(endpoint.id, result)}
                />
            )}
        </div>
    );
};

interface ManageWorkspacesModalProps {
    workspaces: Workspace[];
    onClose: () => void;
    onAdd: (name: string) => void;
    onRename: (id: string, newName: string) => void;
    onDelete: (id: string) => void;
}

const ManageWorkspacesModal: React.FC<ManageWorkspacesModalProps> = ({ workspaces, onClose, onAdd, onRename, onDelete }) => {
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renamingName, setRenamingName] = useState('');

    const handleAdd = () => {
        if (newWorkspaceName.trim()) {
            onAdd(newWorkspaceName.trim());
            setNewWorkspaceName('');
        }
    };

    const handleStartRename = (workspace: Workspace) => {
        setRenamingId(workspace.id);
        setRenamingName(workspace.name);
    };

    const handleConfirmRename = () => {
        if (renamingId && renamingName.trim()) {
            onRename(renamingId, renamingName.trim());
            setRenamingId(null);
            setRenamingName('');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Manage Workspaces</h2>
                <div className="add-workspace">
                    <input
                        type="text"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        placeholder="New workspace name"
                    />
                    <button onClick={handleAdd}>Add Workspace</button>
                </div>
                <ul className="workspace-list">
                    {workspaces.map(ws => (
                        <li key={ws.id}>
                            {renamingId === ws.id ? (
                                <input
                                    type="text"
                                    value={renamingName}
                                    onChange={(e) => setRenamingName(e.target.value)}
                                    onBlur={handleConfirmRename}
                                    onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()}
                                    autoFocus
                                />
                            ) : (
                                <span>{ws.name}</span>
                            )}
                            <div className="workspace-actions">
                                {renamingId === ws.id ? (
                                    <button onClick={handleConfirmRename}><CheckIcon /></button>
                                ) : (
                                    <button onClick={() => handleStartRename(ws)}><PencilIcon /></button>
                                )}
                                <button onClick={() => onDelete(ws.id)} disabled={workspaces.length <= 1}><TrashIcon /></button>
                            </div>
                        </li>
                    ))}
                </ul>
                <button className="close-btn" onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

const SystemMapView = ({ endpoints, endpointStatuses, onSelectEndpoint }: { endpoints: Endpoint[], endpointStatuses: { [id: string]: boolean }, onSelectEndpoint: (id: string) => void }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [positions, setPositions] = useState<{[id: string]: {x: number, y: number}}>({});

    const calculatePositions = useCallback(() => {
        if (!svgRef.current || endpoints.length === 0) return;
        const { width, height } = svgRef.current.getBoundingClientRect();
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 80;
        const newPositions: {[id: string]: {x: number, y: number}} = {};
        const angleStep = (2 * Math.PI) / endpoints.length;
        
        endpoints.forEach((endpoint, i) => {
            newPositions[endpoint.id] = {
                x: centerX + radius * Math.cos(i * angleStep - Math.PI / 2),
                y: centerY + radius * Math.sin(i * angleStep - Math.PI / 2)
            };
        });
        setPositions(positions);
    }, [endpoints]);

    useEffect(() => {
        calculatePositions();
        window.addEventListener('resize', calculatePositions);
        return () => window.removeEventListener('resize', calculatePositions);
    }, [calculatePositions]);

    const edges = useMemo(() => {
        const result: { from: string, to: string }[] = [];
        endpoints.forEach(endpoint => {
            (endpoint.dependencies || []).forEach(depId => {
                if (endpoints.some(e => e.id === depId)) { // Ensure dependency exists
                    result.push({ from: endpoint.id, to: depId });
                }
            });
        });
        return result;
    }, [endpoints]);

    return (
        <div className="system-map-view">
            <h2>System Dependency Map</h2>
            <div className="system-map-container card">
                {endpoints.length === 0 ? (
                    <div className="chart-placeholder">Add endpoints and define their dependencies to see a system map.</div>
                ) : (
                <svg ref={svgRef} width="100%" height="100%">
                    <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#888" />
                        </marker>
                    </defs>
                    <g className="edges">
                        {edges.map((edge, i) => {
                            const fromPos = positions[edge.from];
                            const toPos = positions[edge.to];
                            if (!fromPos || !toPos) return null;
                            return <line key={i} x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y} className="edge-line" markerEnd="url(#arrow)" />;
                        })}
                    </g>
                     <g className="nodes">
                        {endpoints.map(endpoint => {
                            const pos = positions[endpoint.id];
                            if (!pos) return null;
                            const isUp = endpointStatuses[endpoint.id];
                            const statusClass = isUp === undefined ? 'status-unknown' : isUp ? 'status-up' : 'status-down';
                            
                            return (
                                <g key={endpoint.id} transform={`translate(${pos.x}, ${pos.y})`} className="node" onClick={() => onSelectEndpoint(endpoint.id)}>
                                    <circle r="30" className={`node-circle ${statusClass}`} />
                                    <text y="-35" textAnchor="middle" className="node-label">{endpoint.name}</text>
                                    <text y="5" textAnchor="middle" className="node-group-label">{endpoint.group || 'Ungrouped'}</text>
                                </g>
                            );
                        })}
                    </g>
                </svg>
                )}
            </div>
        </div>
    )
}

const SettingsModal = ({ settings, setSettings, onClose }: { settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>>, onClose: () => void }) => {
    const [newTemplateName, setNewTemplateName] = useState('');

    const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        setSettings(prev => ({...prev, [key]: value}));
    };

    const handleAddTemplate = () => {
        if (!newTemplateName.trim()) return;
        const newTemplate: EndpointTemplate = {
            id: `tpl_${Date.now()}`,
            name: newTemplateName.trim(),
            config: {
                ...DEFAULT_ENDPOINT,
                group: 'From Template',
            }
        };
        handleSettingChange('templates', [...settings.templates, newTemplate]);
        setNewTemplateName('');
    };
    
    const handleRemoveTemplate = (id: string) => {
        handleSettingChange('templates', settings.templates.filter(t => t.id !== id));
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content settings-modal">
                <h2>Settings</h2>

                <div className="form-section">
                    <h3><PaintBrushIcon /> Appearance</h3>
                    <div className="form-group">
                        <label>Theme</label>
                        <div className="segmented-control">
                            <button className={settings.theme === 'system' ? 'active' : ''} onClick={() => handleSettingChange('theme', 'system')}>System</button>
                            <button className={settings.theme === 'light' ? 'active' : ''} onClick={() => handleSettingChange('theme', 'light')}>Light</button>
                            <button className={settings.theme === 'dark' ? 'active' : ''} onClick={() => handleSettingChange('theme', 'dark')}>Dark</button>
                        </div>
                    </div>
                     <div className="form-group">
                        <label>Accent Color</label>
                        <div className="color-picker-wrapper">
                             <input 
                                type="color" 
                                value={settings.accentColor} 
                                onChange={e => handleSettingChange('accentColor', e.target.value)}
                             />
                             <span>{settings.accentColor}</span>
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h3><CodeBracketIcon /> Developer Mode</h3>
                     <div className="form-group">
                        <label className="toggle-switch">
                            <input type="checkbox" checked={settings.devMode} onChange={e => handleSettingChange('devMode', e.target.checked)} />
                            <span className="slider"></span>
                            <span className="label-text">Enable developer-focused features like header inspection and advanced cURL commands.</span>
                        </label>
                    </div>
                </div>

                <div className="form-section">
                    <h3><ClipboardIcon/> Endpoint Templates</h3>
                    <p className="form-tip">Create templates to quickly add new endpoints with pre-filled configurations.</p>
                    <div className="add-workspace">
                        <input
                            type="text"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            placeholder="New template name"
                        />
                        <button onClick={handleAddTemplate}>Create Template</button>
                    </div>
                     <ul className="workspace-list">
                        {settings.templates.map(template => (
                            <li key={template.id}>
                                <span>{template.name}</span>
                                <div className="workspace-actions">
                                    <button onClick={() => alert('Editing templates coming soon!')} disabled><PencilIcon /></button>
                                    <button onClick={() => handleRemoveTemplate(template.id)}><TrashIcon /></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="form-actions">
                    <button type="button" className="submit-btn" onClick={onClose}>Done</button>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const [workspaces, setWorkspaces] = useLocalStorage<Workspaces>('api-monitor-workspaces', {});
    const [activeWorkspaceId, setActiveWorkspaceId] = useLocalStorage<string | null>('api-monitor-active-workspace', null);
    const [settings, setSettings] = useLocalStorage<AppSettings>('api-monitor-settings', DEFAULT_SETTINGS);

    const [view, setView] = useState<ViewType>('dashboard');
    const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isWorkspaceManagerOpen, setIsWorkspaceManagerOpen] = useState(false);
    const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false);
    const [isAutoSetupOpen, setIsAutoSetupOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const timersRef = useRef<{ [key: string]: number }>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const workspaceSwitcherRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        // Apply theme and accent color
        const root = document.documentElement;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (settings.theme === 'dark' || (settings.theme === 'system' && prefersDark)) {
            root.classList.add('theme-dark');
            root.classList.remove('theme-light');
        } else {
            root.classList.add('theme-light');
            root.classList.remove('theme-dark');
        }
        root.style.setProperty('--accent-color', settings.accentColor);
    }, [settings.theme, settings.accentColor]);

    useEffect(() => {
        if (Object.keys(workspaces).length === 0) {
            const id = `ws_${Date.now()}`;
            setWorkspaces({ [id]: { id, name: "My First Workspace", endpoints: [], history: [], benchmarkHistory: {} } });
            setActiveWorkspaceId(id);
        } else if (!activeWorkspaceId || !workspaces[activeWorkspaceId]) {
            setActiveWorkspaceId(Object.keys(workspaces)[0]);
        }
    }, []);

    useEffect(() => {
        setView('dashboard');
        setSelectedEndpointId(null);
    }, [activeWorkspaceId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (workspaceSwitcherRef.current && !workspaceSwitcherRef.current.contains(event.target as Node)) {
                setIsWorkspaceSwitcherOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeWorkspace = activeWorkspaceId ? workspaces[activeWorkspaceId] : null;

    const scheduleCheck = useCallback((endpoint: Endpoint) => {
        const run = async () => {
            const results = await runChecks(endpoint);
            setWorkspaces(prev => {
                const newWorkspaces = {...prev};
                const ws = newWorkspaces[activeWorkspaceId!];
                if (!ws) return prev;

                const timestamp = Date.now();
                const newHistoryItems = results.map(result => ({
                    ...result,
                    id: `h_${timestamp}_${result.method}`,
                    timestamp: timestamp
                }));

                const newHistory = [...newHistoryItems, ...ws.history];
                if (newHistory.length > 5000) {
                    newHistory.splice(5000);
                }
                newWorkspaces[activeWorkspaceId!] = { ...ws, history: newHistory };
                return newWorkspaces;
            });
            clearTimeout(timersRef.current[endpoint.id]);
            timersRef.current[endpoint.id] = window.setTimeout(() => scheduleCheck(endpoint), INTERVAL_MAP[endpoint.interval]);
        };
        run();
    }, [activeWorkspaceId, setWorkspaces]);

    useEffect(() => {
        if (!activeWorkspace) return;
        
        Object.values(timersRef.current).forEach(clearTimeout);
        timersRef.current = {};

        activeWorkspace.endpoints.forEach(endpoint => {
            timersRef.current[endpoint.id] = window.setTimeout(() => scheduleCheck(endpoint), 1000);
        });

        return () => {
             Object.values(timersRef.current).forEach(clearTimeout);
        }
    }, [activeWorkspace?.endpoints, scheduleCheck]);
    
    const endpointStatuses = useMemo(() => {
        if (!activeWorkspace) return {};
        const statuses: { [endpointId: string]: boolean } = {};
        for (const endpoint of activeWorkspace.endpoints) {
            const endpointHistory = activeWorkspace.history.filter(h => h.endpointId === endpoint.id);
            if (endpointHistory.length === 0) {
                statuses[endpoint.id] = true; 
                continue;
            }
            const latestTimestamp = Math.max(...endpointHistory.map(h => h.timestamp));
            const latestChecks = endpointHistory.filter(h => h.timestamp === latestTimestamp);
            statuses[endpoint.id] = latestChecks.every(c => c.success);
        }
        return statuses;
    }, [activeWorkspace]);

    const handleSelectEndpoint = (id: string) => {
        setSelectedEndpointId(id);
        setView('endpoint');
    }

    const handleAddEndpoint = (endpointData: Omit<Endpoint, 'id' | 'webhookToken'>) => {
        if (!activeWorkspaceId) return;
        const newEndpoint: Endpoint = { ...endpointData, id: `ep_${Date.now()}`, webhookToken: generateWebhookToken() };
        setWorkspaces(prev => {
            const ws = prev[activeWorkspaceId];
            return {...prev, [activeWorkspaceId]: {...ws, endpoints: [...ws.endpoints, newEndpoint]}};
        });
        setShowAddForm(false);
    };

    const handleAddMultipleEndpoints = (endpointsData: Omit<Endpoint, 'id' | 'webhookToken'>[]) => {
        if (!activeWorkspaceId) return;
        const newEndpoints: Endpoint[] = endpointsData.map(data => ({
            ...data,
            id: `ep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            webhookToken: generateWebhookToken()
        }));
        
        setWorkspaces(prev => {
            const ws = prev[activeWorkspaceId];
            return {...prev, [activeWorkspaceId]: {...ws, endpoints: [...ws.endpoints, ...newEndpoints]}};
        });
        setIsAutoSetupOpen(false);
    };

    const handleDeleteEndpoint = (id: string) => {
        if (!activeWorkspaceId) return;
        setWorkspaces(prev => {
            const ws = prev[activeWorkspaceId];
            const updatedEndpoints = ws.endpoints.filter(e => e.id !== id);
            const finalEndpoints = updatedEndpoints.map(e => ({
                ...e,
                dependencies: (e.dependencies || []).filter(depId => depId !== id)
            }));
            return {...prev, [activeWorkspaceId]: {...ws, endpoints: finalEndpoints}};
        });
        setSelectedEndpointId(null);
        setView('dashboard');
    };
    
    const handleUpdateEndpoint = (updatedEndpoint: Endpoint) => {
        if (!activeWorkspaceId) return;
        setWorkspaces(prev => {
             const ws = prev[activeWorkspaceId];
             return {...prev, [activeWorkspaceId]: {...ws, endpoints: ws.endpoints.map(e => e.id === updatedEndpoint.id ? updatedEndpoint : e)}};
        });
    };

    const handleRegenerateWebhookToken = (endpointId: string) => {
        if (!activeWorkspaceId) return;
        setWorkspaces(prev => {
            const ws = prev[activeWorkspaceId];
            const updatedEndpoints = ws.endpoints.map(e => 
                e.id === endpointId ? { ...e, webhookToken: generateWebhookToken() } : e
            );
            return { ...prev, [activeWorkspaceId]: { ...ws, endpoints: updatedEndpoints } };
        });
    };

    const handleSaveBenchmarkResult = (endpointId: string, result: BenchmarkResult) => {
        if (!activeWorkspaceId) return;
        setWorkspaces(prev => {
            const ws = prev[activeWorkspaceId];
            const newBenchmarkHistory = { ...(ws.benchmarkHistory || {}) };
            const endpointHistory = newBenchmarkHistory[endpointId] || [];
            newBenchmarkHistory[endpointId] = [result, ...endpointHistory].slice(0, 20);
            
            return {
                ...prev,
                [activeWorkspaceId]: { ...ws, benchmarkHistory: newBenchmarkHistory }
            };
        });
    };

    const handleAddWorkspace = (name: string) => {
        const id = `ws_${Date.now()}`;
        const newWorkspace: Workspace = { id, name, endpoints: [], history: [], benchmarkHistory: {} };
        setWorkspaces(prev => ({ ...prev, [id]: newWorkspace }));
        setActiveWorkspaceId(id);
    };

    const handleRenameWorkspace = (id: string, newName: string) => {
        setWorkspaces(prev => ({ ...prev, [id]: { ...prev[id], name: newName } }));
    };

    const handleDeleteWorkspace = (id: string) => {
        if (Object.keys(workspaces).length <= 1) return;
        setWorkspaces(prev => {
            const newWorkspaces = { ...prev };
            delete newWorkspaces[id];
            if (activeWorkspaceId === id) {
                setActiveWorkspaceId(Object.keys(newWorkspaces)[0]);
            }
            return newWorkspaces;
        });
    };

    const handleExport = () => {
        if (!activeWorkspace) return;
        const dataStr = JSON.stringify(activeWorkspace, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `${activeWorkspace.name.replace(/\s/g, '_')}_config.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (event.target.files && event.target.files[0]) {
            fileReader.readAsText(event.target.files[0], "UTF-8");
            fileReader.onload = e => {
                if (e.target && typeof e.target.result === 'string') {
                    try {
                        const importedWorkspace: Workspace = JSON.parse(e.target.result);
                        if (importedWorkspace.id && importedWorkspace.name && Array.isArray(importedWorkspace.endpoints)) {
                             if (!importedWorkspace.benchmarkHistory) {
                                importedWorkspace.benchmarkHistory = {};
                             }
                             setWorkspaces(prev => ({...prev, [importedWorkspace.id]: importedWorkspace}));
                             setActiveWorkspaceId(importedWorkspace.id);
                        } else {
                            alert("Invalid workspace file format.");
                        }
                    } catch (error) {
                         alert("Error parsing file. Make sure it's a valid workspace JSON.");
                    }
                }
            };
        }
    };
    
    const selectedEndpoint = activeWorkspace?.endpoints.find(e => e.id === selectedEndpointId);
    const selectedEndpointHistory = useMemo(() => 
        (activeWorkspace?.history || []).filter(h => h.endpointId === selectedEndpointId)
        .sort((a, b) => b.timestamp - a.timestamp), 
    [activeWorkspace?.history, selectedEndpointId]);

    const selectedEndpointBenchmarkHistory = useMemo(() =>
        ((activeWorkspace?.benchmarkHistory || {})[selectedEndpointId!] || [])
        .sort((a, b) => b.timestamp - a.timestamp),
    [activeWorkspace?.benchmarkHistory, selectedEndpointId]);

    const groupedEndpoints = useMemo(() =>
        (activeWorkspace?.endpoints || []).reduce((acc, endpoint) => {
            const groupName = endpoint.group || 'Ungrouped';
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(endpoint);
            return acc;
        }, {} as Record<string, Endpoint[]>),
    [activeWorkspace?.endpoints]);

    const renderContent = () => {
        if (!activeWorkspace) return null;
        switch(view) {
            case 'map':
                return <SystemMapView endpoints={activeWorkspace.endpoints} endpointStatuses={endpointStatuses} onSelectEndpoint={handleSelectEndpoint} />;
            case 'endpoint':
                if (selectedEndpoint) {
                    return <EndpointView 
                        endpoint={selectedEndpoint} 
                        history={selectedEndpointHistory} 
                        benchmarkHistory={selectedEndpointBenchmarkHistory}
                        onDelete={handleDeleteEndpoint} 
                        onUpdate={handleUpdateEndpoint} 
                        onRegenerateToken={handleRegenerateWebhookToken} 
                        onSaveBenchmarkResult={handleSaveBenchmarkResult}
                        devMode={settings.devMode}
                    />;
                }
                 // Fallback to dashboard if no endpoint selected
                setView('dashboard');
                return null;
            case 'dashboard':
            default:
                 return <GlobalDashboard 
                    endpoints={activeWorkspace.endpoints} 
                    history={activeWorkspace.history} 
                    onSelectEndpoint={handleSelectEndpoint}
                    onAutoSetup={() => setIsAutoSetupOpen(true)}
                    onShowAddForm={() => setShowAddForm(true)}
                 />;
        }
    };

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1>API Monitor Pro</h1>
                    <div className="header-actions">
                        {settings.devMode && <CodeBracketIcon className="dev-mode-indicator" title="Developer Mode Active" />}
                        <button className="settings-btn" onClick={() => setIsSettingsOpen(true)} aria-label="Open settings">
                            <CogIcon />
                        </button>
                    </div>
                </div>
                
                <div className="workspace-switcher" ref={workspaceSwitcherRef}>
                    <button className="switcher-toggle" onClick={() => setIsWorkspaceSwitcherOpen(!isWorkspaceSwitcherOpen)}>
                        <span>{activeWorkspace?.name || 'No Workspace'}</span>
                        <ArrowDownIcon />
                    </button>
                    {isWorkspaceSwitcherOpen && (
                        <div className="switcher-dropdown">
                            {Object.values(workspaces).map(ws => (
                                <div key={ws.id} className={`switcher-item ${ws.id === activeWorkspaceId ? 'active' : ''}`} onClick={() => { setActiveWorkspaceId(ws.id); setIsWorkspaceSwitcherOpen(false); }}>
                                    {ws.name}
                                </div>
                            ))}
                            <div className="switcher-actions">
                                <button onClick={() => { setIsWorkspaceManagerOpen(true); setIsWorkspaceSwitcherOpen(false); }}>
                                    <PencilIcon /> Manage Workspaces
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <nav className="endpoint-list">
                    <div className="endpoint-list-header">
                        <button onClick={() => { setSelectedEndpointId(null); setView('dashboard'); }}>Dashboard</button>
                        <button onClick={() => { setSelectedEndpointId(null); setView('map'); }}>System Map</button>
                        <button className="add-endpoint-btn" onClick={() => setShowAddForm(true)} aria-label="Add new endpoint"><PlusIcon /></button>
                    </div>
                    {Object.entries(groupedEndpoints).map(([group, endpoints]: [string, any]) => (
                        <div key={group} className="endpoint-group-nav">
                            <h4>{group}</h4>
                            <ul>
                            {endpoints.map((endpoint: Endpoint) => (
                                <li key={endpoint.id} className={selectedEndpointId === endpoint.id ? 'active' : ''} onClick={() => handleSelectEndpoint(endpoint.id)}>
                                    <span className={`status-dot ${
                                        endpointStatuses[endpoint.id] ? 'status-up' : 'status-down'
                                    }`}></span>
                                    {endpoint.name}
                                </li>
                            ))}
                            </ul>
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button onClick={handleExport}>Export Workspace</button>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImport} accept=".json" />
                    <button onClick={() => fileInputRef.current?.click()}>Import Workspace</button>
                </div>
            </aside>
            <main className="main-content">
                {showAddForm && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <AddEndpointForm allEndpoints={activeWorkspace?.endpoints || []} onAdd={handleAddEndpoint} onCancel={() => setShowAddForm(false)} templates={settings.templates} />
                        </div>
                    </div>
                )}
                {isWorkspaceManagerOpen && (
                    <ManageWorkspacesModal
                        workspaces={Object.values(workspaces)}
                        onClose={() => setIsWorkspaceManagerOpen(false)}
                        onAdd={handleAddWorkspace}
                        onRename={handleRenameWorkspace}
                        onDelete={handleDeleteWorkspace}
                    />
                )}
                 {isAutoSetupOpen && (
                    <AutoSetupModal
                        onAddMultiple={handleAddMultipleEndpoints}
                        onCancel={() => setIsAutoSetupOpen(false)}
                    />
                )}
                {isSettingsOpen && (
                    <SettingsModal
                        settings={settings}
                        setSettings={setSettings}
                        onClose={() => setIsSettingsOpen(false)}
                    />
                )}
                
                {renderContent()}
            </main>
        </div>
    );
};


const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);