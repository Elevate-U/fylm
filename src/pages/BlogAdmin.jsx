import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { BlogAPI } from '../utils/blogApi.js';
import ImageProcessor from '../utils/imageProcessor.js';
import { updatePageTitle, updateMetaDescription } from '../utils/seoUtils.js';
import { supabase } from '../utils/supabase.js';
import { useAuth } from '../context/Auth';
import Header from '../components/Header';
import './BlogAdmin.css';

// Enhanced CSS styles for the blog admin interface
const adminStyles = `
    .blog-admin {
        min-height: 100vh;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        color: white;
        padding: 0;
    }

    .admin-header {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding: 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
    }

    .admin-header h1 {
        margin: 0;
        font-size: 2rem;
        font-weight: 700;
        background: linear-gradient(45deg, #667eea, #764ba2);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .header-actions {
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .refresh-btn, .create-post-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.875rem 1.75rem;
        border: none;
        border-radius: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        text-decoration: none;
        font-size: 0.95rem;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .refresh-btn {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .refresh-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.3);
    }

    .refresh-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .refresh-btn .icon.spinning {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .create-post-btn {
        background: linear-gradient(45deg, #667eea, #764ba2);
        color: white;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }

    .create-post-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }

    .stats-dashboard {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin: 2rem;
        margin-bottom: 2rem;
    }

    .stat-card {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1.5rem;
        text-align: center;
        transition: all 0.3s ease;
    }

    .stat-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        border-color: rgba(102, 126, 234, 0.3);
    }

    .stat-card h3 {
        margin: 0 0 0.5rem 0;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.7);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .stat-number {
        font-size: 2.5rem;
        font-weight: 700;
        margin: 0;
        background: linear-gradient(45deg, #667eea, #764ba2);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .admin-controls {
        margin: 2rem;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1.5rem;
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
    }

    .search-form {
        display: flex;
        gap: 0.5rem;
        flex: 1;
        min-width: 250px;
        position: relative;
    }

    .search-input {
        flex: 1;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 0.875rem 1.25rem;
        color: white;
        font-size: 0.95rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .search-input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15), 0 4px 20px rgba(0, 0, 0, 0.2);
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-1px);
    }

    .search-input::placeholder {
        color: rgba(255, 255, 255, 0.5);
        font-style: italic;
    }

    .search-btn {
        background: linear-gradient(45deg, #667eea, #764ba2);
        border: none;
        border-radius: 12px;
        padding: 0.875rem 1.75rem;
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.95rem;
    }

    .search-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(102, 126, 234, 0.4);
        background: linear-gradient(45deg, #764ba2, #667eea);
    }

    .search-btn:active {
        transform: translateY(0);
        box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
    }

    .filters {
        display: flex;
        gap: 1rem;
    }

    .filter-select {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 0.75rem 1rem;
        color: white;
        font-size: 0.9rem;
        min-width: 150px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .filter-select:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .filter-select:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15), 0 4px 20px rgba(0, 0, 0, 0.2);
        background: rgba(255, 255, 255, 0.2);
    }

    .filter-select option {
        background: #1a1a2e;
        color: white;
    }

    .bulk-actions-toolbar {
        margin: 0 2rem;
        background: rgba(102, 126, 234, 0.1);
        border: 1px solid rgba(102, 126, 234, 0.3);
        border-radius: 12px;
        padding: 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 1rem;
        backdrop-filter: blur(10px);
    }

    .bulk-info {
        color: #667eea;
        font-weight: 500;
    }

    .bulk-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .bulk-btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        backdrop-filter: blur(10px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .bulk-btn.publish-btn {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
        border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .bulk-btn.draft-btn {
        background: rgba(251, 191, 36, 0.2);
        color: #fbbf24;
        border: 1px solid rgba(251, 191, 36, 0.3);
    }

    .bulk-btn.delete-btn {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .bulk-btn.cancel-btn {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .bulk-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .bulk-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    .posts-table-container {
        margin: 2rem;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        overflow: hidden;
    }

    .posts-table {
        width: 100%;
        border-collapse: collapse;
    }

    .posts-table thead {
        background: rgba(255, 255, 255, 0.1);
    }

    .posts-table th {
        padding: 1rem;
        text-align: left;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .posts-table tbody tr {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.2s ease;
    }

    .posts-table tbody tr:hover {
        background: rgba(255, 255, 255, 0.02);
    }

    .posts-table tbody tr.selected {
        background: rgba(102, 126, 234, 0.1);
        border-color: rgba(102, 126, 234, 0.3);
    }

    .posts-table td {
        padding: 1rem;
        vertical-align: middle;
    }

    .checkbox-cell {
        width: 40px;
        text-align: center;
    }

    .post-title-cell {
        min-width: 250px;
    }

    .post-title-info h4 {
        margin: 0 0 0.25rem 0;
        font-weight: 600;
        color: white;
        font-size: 1rem;
    }

    .post-excerpt {
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.85rem;
        line-height: 1.4;
        margin: 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .category-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 500;
        transition: all 0.2s ease;
    }

    .category-badge.enhanced {
        border: 1px solid;
        backdrop-filter: blur(10px);
    }

    .category-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 6px;
    }

    .status-toggle {
        display: inline-flex;
        align-items: center;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .status-toggle.enhanced {
        border: 1px solid;
        backdrop-filter: blur(10px);
    }

    .status-toggle.published {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
        border-color: rgba(34, 197, 94, 0.3);
    }

    .status-toggle.draft {
        background: rgba(251, 191, 36, 0.1);
        color: #fbbf24;
        border-color: rgba(251, 191, 36, 0.3);
    }

    .status-toggle:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 8px;
    }

    .status-dot.published {
        background: #22c55e;
    }

    .status-dot.draft {
        background: #fbbf24;
    }

    .date-cell {
        min-width: 120px;
    }

    .date-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .date {
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.85rem;
    }

    .time {
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.75rem;
    }

    .time.relative {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .views-cell {
        text-align: center;
        min-width: 80px;
    }

    .view-count {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
    }

    .view-count .count {
        font-weight: 600;
        color: white;
        font-size: 1rem;
    }

    .view-count .label {
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.75rem;
    }

    .view-icon {
        width: 12px;
        height: 12px;
        opacity: 0.6;
    }

    .actions-cell {
        min-width: 120px;
    }

    .action-buttons {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
    }

    .edit-btn, .view-btn, .delete-btn, .duplicate-btn, .analytics-btn-small {
        padding: 0.5rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        font-size: 14px;
    }

    .edit-btn {
        background: rgba(59, 130, 246, 0.2);
        color: #3b82f6;
        border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .view-btn {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
        border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .duplicate-btn {
        background: rgba(168, 85, 247, 0.2);
        color: #a855f7;
        border: 1px solid rgba(168, 85, 247, 0.3);
    }

    .analytics-btn-small {
        background: rgba(156, 39, 176, 0.2);
        color: #9c27b0;
        border: 1px solid rgba(156, 39, 176, 0.3);
    }

    .delete-btn {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .edit-btn:hover, .view-btn:hover, .delete-btn:hover, .duplicate-btn:hover, .analytics-btn-small:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .auto-refresh-btn, .analytics-btn, .export-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.875rem 1.75rem;
        border: none;
        border-radius: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        text-decoration: none;
        font-size: 0.95rem;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        position: relative;
        overflow: hidden;
    }

    .auto-refresh-btn::before,
    .analytics-btn::before,
    .export-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        transition: left 0.5s;
    }

    .auto-refresh-btn:hover::before,
    .analytics-btn:hover::before,
    .export-btn:hover::before {
        left: 100%;
    }

    .auto-refresh-btn {
        background: linear-gradient(135deg, rgba(33, 150, 243, 0.15), rgba(33, 150, 243, 0.05));
        color: #2196F3;
        border: 1px solid rgba(33, 150, 243, 0.3);
    }

    .auto-refresh-btn:hover {
        background: linear-gradient(135deg, rgba(33, 150, 243, 0.25), rgba(33, 150, 243, 0.15));
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(33, 150, 243, 0.3);
        border-color: rgba(33, 150, 243, 0.4);
    }

    .auto-refresh-btn.active {
        background: linear-gradient(135deg, rgba(255, 152, 0, 0.25), rgba(255, 152, 0, 0.15));
        color: #FF9800;
        border-color: rgba(255, 152, 0, 0.4);
        box-shadow: 0 4px 20px rgba(255, 152, 0, 0.3);
    }

    .auto-refresh-btn.active:hover {
        background: linear-gradient(135deg, rgba(255, 152, 0, 0.35), rgba(255, 152, 0, 0.25));
        box-shadow: 0 6px 30px rgba(255, 152, 0, 0.4);
    }

    .analytics-btn {
        background: linear-gradient(135deg, rgba(156, 39, 176, 0.15), rgba(156, 39, 176, 0.05));
        color: #9C27B0;
        border: 1px solid rgba(156, 39, 176, 0.3);
    }

    .analytics-btn:hover {
        background: linear-gradient(135deg, rgba(156, 39, 176, 0.25), rgba(156, 39, 176, 0.15));
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(156, 39, 176, 0.3);
        border-color: rgba(156, 39, 176, 0.4);
    }

    .export-btn {
        background: linear-gradient(135deg, rgba(96, 125, 139, 0.15), rgba(96, 125, 139, 0.05));
        color: #607D8B;
        border: 1px solid rgba(96, 125, 139, 0.3);
    }

    .export-btn:hover {
        background: linear-gradient(135deg, rgba(96, 125, 139, 0.25), rgba(96, 125, 139, 0.15));
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(96, 125, 139, 0.3);
        border-color: rgba(96, 125, 139, 0.4);
    }

    .last-refresh {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.6);
        margin-left: 1rem;
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(5px);
        font-style: italic;
    }

    .analytics-tooltip {
        position: absolute;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        margin-top: 4px;
        z-index: 1000;
    }

    .analytics-section {
        margin: 2rem;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1.5rem;
    }

    .analytics-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .analytics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    .analytics-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 1rem;
        text-align: center;
    }

    .analytics-card h4 {
        margin: 0 0 0.5rem 0;
        color: rgba(255, 255, 255, 0.7);
        font-size: 0.85rem;
    }

    .analytics-value {
        font-size: 1.5rem;
        font-weight: 600;
        color: white;
    }

    .no-posts {
        text-align: center;
        padding: 3rem;
        color: rgba(255, 255, 255, 0.6);
    }

    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
        margin: 2rem;
    }

    .page-btn {
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.9rem;
    }

    .page-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
    }

    .page-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .page-btn.active {
        background: linear-gradient(45deg, #667eea, #764ba2);
        border-color: transparent;
    }

    .page-numbers {
        display: flex;
        gap: 0.25rem;
    }

    .error-message {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 8px;
        padding: 1rem;
        color: #ef4444;
        margin: 2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .dismiss-error {
        background: none;
        border: none;
        color: #ef4444;
        cursor: pointer;
        font-size: 1.2rem;
        padding: 0.25rem;
    }

    .loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        gap: 1rem;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s ease-in-out infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .access-denied {
        text-align: center;
        padding: 3rem;
        max-width: 500px;
        margin: 0 auto;
    }

    .access-denied h1 {
        color: #ef4444;
        margin-bottom: 1rem;
    }

    .access-denied p {
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 1rem;
        line-height: 1.6;
    }

    .back-to-blog-btn {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        background: linear-gradient(45deg, #667eea, #764ba2);
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 500;
        transition: all 0.3s ease;
    }

    .back-to-blog-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }

    @media (max-width: 768px) {
        .admin-header {
            padding: 1rem;
            flex-direction: column;
            align-items: stretch;
        }

        .header-actions {
            justify-content: center;
        }

        .stats-dashboard {
            margin: 1rem;
            grid-template-columns: 1fr;
        }

        .admin-controls {
            margin: 1rem;
            flex-direction: column;
            align-items: stretch;
        }

        .search-form {
            min-width: auto;
        }

        .filters {
            flex-direction: column;
        }

        .bulk-actions-toolbar {
            margin: 0 1rem;
            flex-direction: column;
            align-items: stretch;
        }

        .bulk-actions {
            justify-content: center;
        }

        .posts-table-container {
            margin: 1rem;
            overflow-x: auto;
        }

        .posts-table {
            min-width: 800px;
        }

        .pagination {
            margin: 1rem;
            flex-wrap: wrap;
        }

        .error-message {
            margin: 1rem;
        }
    }

    /* Modern Markdown Editor Styles */
    .markdown-editor {
        border: 1px solid #e1e5e9;
        border-radius: 12px;
        overflow: hidden;
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
    }

    .markdown-editor:focus-within {
        border-color: #007bff;
        box-shadow: 0 4px 16px rgba(0, 123, 255, 0.15);
    }

    .markdown-editor.fullscreen {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        border-radius: 0;
        height: 100vh;
        width: 100vw;
    }

    .editor-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px 16px;
        background: #f8f9fa;
        border-bottom: 1px solid #e1e5e9;
        align-items: center;
    }

    .toolbar-group {
        display: flex;
        gap: 4px;
        padding-right: 12px;
        border-right: 1px solid #dee2e6;
    }

    .toolbar-group:last-child {
        border-right: none;
    }

    .toolbar-btn {
        padding: 6px 10px;
        border: 1px solid #dee2e6;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        color: #495057;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .toolbar-btn:hover {
        background: #e9ecef;
        border-color: #adb5bd;
        color: #212529;
    }

    .toolbar-btn.active {
        background: #007bff;
        border-color: #007bff;
        color: white;
    }

    .editor-content {
        display: flex;
        height: 500px;
    }

    .markdown-editor.fullscreen .editor-content {
        height: calc(100vh - 60px);
    }

    .editor-input {
        flex: 1;
        border: none;
        padding: 20px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 14px;
        line-height: 1.6;
        resize: none;
        outline: none;
        background: #fafbfc;
        color: #24292e;
    }

    .editor-preview {
        flex: 1;
        padding: 20px;
        background: white;
        border-left: 1px solid #e1e5e9;
        overflow-y: auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .preview-toggle {
        display: flex;
        background: #f8f9fa;
        border-bottom: 1px solid #e1e5e9;
    }

    .preview-tab {
        flex: 1;
        padding: 12px;
        text-align: center;
        cursor: pointer;
        border: none;
        background: transparent;
        color: #6c757d;
        font-weight: 500;
        transition: all 0.2s ease;
    }

    .preview-tab.active {
        background: white;
        color: #007bff;
        border-bottom: 2px solid #007bff;
    }

    .markdown-guide {
        background: #f8f9fa;
        border: 1px solid #e1e5e9;
        border-radius: 8px;
        padding: 16px;
        margin-top: 16px;
        font-size: 13px;
    }

    .markdown-guide h4 {
        margin: 0 0 12px 0;
        color: #495057;
        font-size: 14px;
    }

    .guide-toggle {
        background: #007bff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
    }

    .guide-toggle:hover {
        background: #0056b3;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
    }

    .guide-content {
        border-top: 1px solid #e1e5e9;
        padding-top: 16px;
    }

    .guide-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
    }

    .guide-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        border-bottom: 1px solid #e9ecef;
    }

    .guide-item:last-child {
        border-bottom: none;
    }

    .guide-syntax {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        background: #e9ecef;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
    }

    /* Movie Search Modal Styles */
    .movie-search-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
    }

    .movie-search-content {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        width: 100%;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }

    .movie-search-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e1e5e9;
    }

    .movie-search-header h3 {
        margin: 0;
        color: #212529;
        font-size: 1.25rem;
    }

    .movie-search-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #6c757d;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.2s ease;
    }

    .movie-search-close:hover {
        background: #f8f9fa;
        color: #212529;
    }

    .movie-search-form {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .movie-search-input {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        background: white;
        color: #212529;
        font-size: 1rem;
    }

    .movie-search-input:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.2);
    }

    .movie-search-btn {
        padding: 0.75rem 1.5rem;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
    }

    .movie-search-btn:hover {
        background: #0056b3;
        transform: translateY(-1px);
    }

    .movie-search-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }

    .movie-results {
        display: grid;
        gap: 1rem;
        max-height: 400px;
        overflow-y: auto;
    }

    .movie-item {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        background: #f8f9fa;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .movie-item:hover {
        border-color: #007bff;
        background: #e7f3ff;
        transform: translateY(-1px);
    }

    .movie-poster {
        width: 60px;
        height: 90px;
        border-radius: 6px;
        object-fit: cover;
        background: #e9ecef;
        flex-shrink: 0;
    }

    .movie-info {
        flex: 1;
        min-width: 0;
    }

    .movie-title {
        font-weight: 600;
        color: #212529;
        margin: 0 0 0.25rem 0;
        font-size: 1rem;
    }

    .movie-year {
        color: #6c757d;
        font-size: 0.875rem;
        margin: 0 0 0.5rem 0;
    }

    .movie-overview {
        color: #6c757d;
        font-size: 0.875rem;
        line-height: 1.4;
        margin: 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .movie-search-loading {
        text-align: center;
        padding: 2rem;
        color: #6c757d;
    }

    .movie-search-empty {
        text-align: center;
        padding: 2rem;
        color: #6c757d;
    }

    .movie-search-empty p {
        margin: 0;
    }

    /* Export Modal Styles */
    .export-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
    }

    .export-modal-content {
        background: white;
        border-radius: 12px;
        padding: 24px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        animation: modalSlideIn 0.3s ease;
    }

    @keyframes modalSlideIn {
        from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .export-modal h3 {
        margin: 0 0 20px 0;
        color: #212529;
        font-size: 20px;
        font-weight: 600;
    }

    .export-options {
        display: grid;
        gap: 12px;
        margin-bottom: 20px;
    }

    .export-option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .export-option:hover {
        border-color: #007bff;
        background: #f8f9ff;
    }

    .export-option.selected {
        border-color: #007bff;
        background: #e7f3ff;
    }

    .export-option input[type="radio"] {
        margin: 0;
    }

    .export-option-info {
        flex: 1;
    }

    .export-option-title {
        font-weight: 600;
        color: #212529;
        margin-bottom: 4px;
    }

    .export-option-desc {
        font-size: 14px;
        color: #6c757d;
    }

    .export-modal-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
    }

    .export-modal-btn {
        padding: 10px 20px;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
    }

    .export-modal-btn.primary {
        background: #007bff;
        border-color: #007bff;
        color: white;
    }

    .export-modal-btn.primary:hover {
        background: #0056b3;
        border-color: #0056b3;
    }

    .export-modal-btn.secondary {
        background: white;
        color: #6c757d;
    }

    .export-modal-btn.secondary:hover {
        background: #f8f9fa;
        color: #495057;
    }

    /* Enhanced Blog Editor Styles */
    .blog-editor {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        margin: 20px 0;
    }

    .editor-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .editor-title {
        font-size: 20px;
        font-weight: 600;
        margin: 0;
    }

    .editor-form {
        padding: 24px;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
    }

    .form-group {
        margin-bottom: 20px;
    }

    .form-group.full-width {
        grid-column: 1 / -1;
    }

    .form-label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #495057;
        font-size: 14px;
    }

    .form-input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        font-size: 14px;
        transition: all 0.2s ease;
        background: #fafbfc;
    }

    .form-input:focus {
        outline: none;
        border-color: #007bff;
        background: white;
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .form-select {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        font-size: 14px;
        background: #fafbfc;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .form-select:focus {
        outline: none;
        border-color: #007bff;
        background: white;
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .form-textarea {
        width: 100%;
        min-height: 120px;
        padding: 12px 16px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        font-size: 14px;
        resize: vertical;
        font-family: inherit;
        transition: all 0.2s ease;
        background: #fafbfc;
    }

    .form-textarea:focus {
        outline: none;
        border-color: #007bff;
        background: white;
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .editor-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        padding: 20px 24px;
        background: #f8f9fa;
        border-top: 1px solid #e9ecef;
    }

    .editor-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .editor-btn.primary {
        background: #007bff;
        color: white;
    }

    .editor-btn.primary:hover {
        background: #0056b3;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
    }

    .editor-btn.secondary {
        background: #6c757d;
        color: white;
    }

    .editor-btn.secondary:hover {
        background: #545b62;
    }

    .editor-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .form-row {
            grid-template-columns: 1fr;
        }
        
        .editor-content {
            flex-direction: column;
            height: auto;
        }
        
        .editor-preview {
            border-left: none;
            border-top: 1px solid #e1e5e9;
        }
        
        .toolbar-group {
            border-right: none;
            padding-right: 8px;
        }
        
        .export-modal-content {
            margin: 20px;
            width: calc(100% - 40px);
        }
    }
`;

const BlogAdmin = () => {
    // Use authentication context
    const { user, session, loading: authLoading, authReady } = useAuth();
    
    const [posts, setPosts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showEditor, setShowEditor] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [stats, setStats] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingAdmin, setCheckingAdmin] = useState(true);
    const [adminChecked, setAdminChecked] = useState(false);
    const [selectedPosts, setSelectedPosts] = useState([]);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [postAnalytics, setPostAnalytics] = useState({});
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);

    const blogAPI = new BlogAPI();
    const imageProcessor = new ImageProcessor();

    // Cache admin status to avoid repeated checks
    const checkAdminStatus = async () => {
        if (adminChecked) return isAdmin; // Return cached result
        
        try {
            console.log('Checking admin status...');
            setCheckingAdmin(true);
            const adminStatus = await BlogAPI.isAdmin();
            console.log('Admin status result:', adminStatus);
            setIsAdmin(adminStatus);
            setAdminChecked(true);
            
            if (adminStatus) {
                console.log('User is admin, loading data...');
                await loadInitialData();
            } else {
                console.log('User is not admin');
                setError('Access denied. Admin privileges required.');
            }
            return adminStatus;
        } catch (err) {
            console.error('Error checking admin status:', err);
            setError('Failed to verify admin access: ' + err.message);
            return false;
        } finally {
            setCheckingAdmin(false);
        }
    };

    useEffect(() => {
        updatePageTitle('Blog Admin - Manage Posts');
        updateMetaDescription('Admin panel for managing blog posts, categories, and content.');
    }, []);

    // Wait for auth to be ready before checking admin status
    useEffect(() => {
        if (!authReady || authLoading) {
            console.log('Auth not ready yet, waiting...', { authReady, authLoading });
            return;
        }

        if (!user || !session) {
            console.log('No user or session, redirecting to login');
            setError('Please log in to access the admin panel.');
            setCheckingAdmin(false);
            return;
        }

        const initializeAdmin = async () => {
            console.log('Auth ready, initializing admin with user:', user?.email);
            const adminStatus = await checkAdminStatus();
            if (adminStatus) {
                await loadPosts();
            }
        };
        
        initializeAdmin();
        
        // Check for edit parameter in URL
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        const editPostId = urlParams.get('edit');
        if (editPostId) {
            handleEditPostById(editPostId);
        }
    }, [authReady, authLoading, user, session]);

    // Separate effect for posts loading that only triggers when necessary
    useEffect(() => {
        if (isAdmin && adminChecked) {
            loadPosts();
        }
    }, [currentPage, searchTerm, selectedCategory, sortBy, sortOrder]);

    // Separate effect for admin status changes
    useEffect(() => {
        if (adminChecked && isAdmin) {
            loadPosts();
        }
    }, [isAdmin, adminChecked]);

    const loadInitialData = async () => {
        if (!isAdmin) return;
        
        try {
            const [categoriesData, statsData] = await Promise.all([
                BlogAPI.getCategories(),
                BlogAPI.getBlogStats()
            ]);
            setCategories(categoriesData);
            setStats(statsData);
        } catch (err) {
            console.error('Error loading initial data:', err);
            setError('Failed to load admin data');
        }
    };

    const loadPosts = async () => {
        console.log('loadPosts called, isAdmin:', isAdmin);
        if (!isAdmin || !adminChecked) {
            console.log('User is not admin or admin status not checked, skipping loadPosts');
            return;
        }
        
        try {
            setLoading(true);
            setError(null);
            console.log('Loading posts...');
            
            // Get category slug for filtering
            const categorySlug = selectedCategory ? 
                categories.find(cat => cat.id === selectedCategory)?.slug : null;
            
            // Use the admin function to get all posts
            const { data, error } = await supabase
                .rpc('get_all_blog_posts_admin', {
                    limit_count: 10,
                    offset_count: (currentPage - 1) * 10,
                    filter_status: null, // Show all statuses
                    filter_category_slug: categorySlug
                });
            
            console.log('Supabase response:', { data, error });
            if (error) throw error;
            
            let postsData = data || [];
            
            // Client-side search filtering if search term exists
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                postsData = postsData.filter(post => 
                    post.title.toLowerCase().includes(searchLower) ||
                    post.excerpt?.toLowerCase().includes(searchLower) ||
                    post.category_name?.toLowerCase().includes(searchLower)
                );
            }
            
            // Client-side sorting
            postsData.sort((a, b) => {
                let aVal, bVal;
                switch (sortBy) {
                    case 'title':
                        aVal = a.title.toLowerCase();
                        bVal = b.title.toLowerCase();
                        break;
                    case 'updated_at':
                        aVal = new Date(a.updated_at);
                        bVal = new Date(b.updated_at);
                        break;
                    case 'created_at':
                    default:
                        aVal = new Date(a.created_at);
                        bVal = new Date(b.created_at);
                        break;
                }
                
                if (sortOrder === 'asc') {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });
            
            setPosts(postsData);
            // For now, we'll handle pagination client-side
            setTotalPages(Math.ceil(postsData.length / 10));
        } catch (err) {
            console.error('Error loading posts:', err);
            setError('Failed to load posts: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = () => {
        setEditingPost(null);
        setShowEditor(true);
    };

    const handleEditPost = async (post) => {
        try {
            setLoading(true);
            // Fetch the complete post data including meta fields
            const fullPost = await BlogAPI.getPostById(post.id);
            if (fullPost) {
                setEditingPost(fullPost);
                setShowEditor(true);
            } else {
                setError('Post not found');
            }
        } catch (err) {
            console.error('Error loading post for editing:', err);
            setError('Failed to load post for editing');
        } finally {
            setLoading(false);
        }
    };

    const handleEditPostById = async (postId) => {
        try {
            setLoading(true);
            const post = await BlogAPI.getPostById(postId);
            if (post) {
                setEditingPost(post);
                setShowEditor(true);
            } else {
                setError('Post not found');
            }
        } catch (err) {
            console.error('Error loading post for editing:', err);
            setError('Failed to load post for editing');
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
            return;
        }

        try {
            setLoading(true);
            await BlogAPI.deletePost(postId);
            await loadPosts();
            await loadInitialData(); // Refresh stats
            // Remove from selected posts if it was selected
            setSelectedPosts(prev => prev.filter(id => id !== postId));
        } catch (err) {
            console.error('Error deleting post:', err);
            setError('Failed to delete post: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Bulk Actions
    const handleSelectPost = (postId) => {
        setSelectedPosts(prev => {
            if (prev.includes(postId)) {
                const newSelected = prev.filter(id => id !== postId);
                setShowBulkActions(newSelected.length > 0);
                return newSelected;
            } else {
                const newSelected = [...prev, postId];
                setShowBulkActions(true);
                return newSelected;
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedPosts.length === posts.length) {
            setSelectedPosts([]);
            setShowBulkActions(false);
        } else {
            const allPostIds = posts.map(post => post.id);
            setSelectedPosts(allPostIds);
            setShowBulkActions(true);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedPosts.length === 0) return;
        
        if (!confirm(`Are you sure you want to delete ${selectedPosts.length} posts? This action cannot be undone.`)) {
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Use the new bulk delete API method
            await BlogAPI.bulkDeletePosts(selectedPosts);

            // Remove deleted posts from state
            setPosts(prevPosts => prevPosts.filter(post => !selectedPosts.includes(post.id)));
            setSelectedPosts([]);
            setShowBulkActions(false);
        } catch (err) {
            console.error('Error bulk deleting posts:', err);
            setError('Failed to delete selected posts');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkStatusChange = async (newStatus) => {
        if (selectedPosts.length === 0) return;
        
        try {
            setLoading(true);
            setError(null);
            
            // Use the new bulk update API method
             await BlogAPI.bulkUpdateStatus(selectedPosts, newStatus);
            
            // Update posts in state
            setPosts(prevPosts => 
                prevPosts.map(post => 
                    selectedPosts.includes(post.id) 
                        ? { ...post, status: newStatus }
                        : post
                )
            );
            
            setSelectedPosts([]);
            setShowBulkActions(false);
        } catch (err) {
            console.error('Error updating posts:', err);
            setError('Failed to update selected posts');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([loadPosts(), loadInitialData()]);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Error refreshing data:', err);
            setError('Failed to refresh data');
        } finally {
            setRefreshing(false);
        }
    };

    // Auto-refresh functionality
    useEffect(() => {
        if (!autoRefresh || !isAdmin) return;
        
        const interval = setInterval(() => {
            handleRefresh();
        }, 30000); // Refresh every 30 seconds
        
        return () => clearInterval(interval);
    }, [autoRefresh, isAdmin]);

    // Load post analytics
    const loadPostAnalytics = async (postId) => {
        try {
            const analytics = await BlogAPI.getPostAnalytics(postId);
            setPostAnalytics(prev => ({ ...prev, [postId]: analytics }));
        } catch (err) {
            console.error('Error loading post analytics:', err);
        }
    };

    // Export posts functionality
    const handleExportPosts = () => {
        setShowExportModal(true);
    };

    // Duplicate post functionality
    const handleDuplicatePost = async (post) => {
        try {
            setLoading(true);
            const duplicatedPost = {
                ...post,
                title: `${post.title} (Copy)`,
                slug: `${post.slug}-copy-${Date.now()}`,
                status: 'draft',
                created_at: undefined,
                updated_at: undefined,
                id: undefined
            };
            
            await BlogAPI.createPost(duplicatedPost);
            await loadPosts();
            await loadInitialData();
        } catch (err) {
            console.error('Error duplicating post:', err);
            setError('Failed to duplicate post');
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePublished = async (post) => {
        try {
            setLoading(true);
            const newStatus = post.status === 'published' ? 'draft' : 'published';
            await BlogAPI.updatePost(post.id, { status: newStatus });
            
            // Update the post in the local state
            setPosts(prevPosts => 
                prevPosts.map(p => 
                    p.id === post.id 
                        ? { ...p, status: newStatus, updated_at: new Date().toISOString() }
                        : p
                )
            );
            
            // Refresh stats after status change
            await loadInitialData();
        } catch (err) {
            console.error('Error updating post status:', err);
            setError('Failed to update post status');
        } finally {
            setLoading(false);
        }
    };

    const handleEditorClose = () => {
        setShowEditor(false);
        setEditingPost(null);
        loadPosts();
        loadInitialData(); // Refresh stats
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1);
        loadPosts();
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatRelativeTime = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return formatDate(dateString);
    };

    if (checkingAdmin || authLoading || !authReady) {
        return (
            <>
                <Header />
                <main className="blog-admin">
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>{authLoading || !authReady ? 'Loading authentication...' : 'Checking admin access...'}</p>
                    </div>
                </main>
            </>
        );
    }

    if (!isAdmin) {
        return (
            <>
                <Header />
                <main className="blog-admin">
                    <div className="access-denied">
                        <h1>Access Denied</h1>
                        <p>You need administrator privileges to access the blog admin panel.</p>
                        <p>If you believe you should have access, please contact the site administrator.</p>
                        <a href="/blog" className="back-to-blog-btn">← Back to Blog</a>
                    </div>
                </main>
            </>
        );
    }

    if (showEditor) {
        return (
            <BlogEditor
                post={editingPost}
                categories={categories}
                onClose={handleEditorClose}
                blogAPI={BlogAPI}
                imageProcessor={imageProcessor}
            />
        );
    }

    return (
        <>
            <Header />
            <main className="blog-admin">
            <div className="admin-header">
                <h1>Blog Admin</h1>
                <div className="header-actions">
                    <button 
                        className="refresh-btn" 
                        onClick={handleRefresh}
                        disabled={refreshing}
                        title="Refresh Data"
                    >
                        <span className={`icon ${refreshing ? 'spinning' : ''}`}>🔄</span>
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    
                    <button
                        className={`auto-refresh-btn ${autoRefresh ? 'active' : ''}`}
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        title="Toggle Auto-refresh (30s)"
                    >
                        <span className="icon">{autoRefresh ? '⏸️' : '▶️'}</span>
                        Auto
                    </button>
                    
                    <button
                        className="analytics-btn"
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        title="Toggle Analytics View"
                    >
                        <span className="icon">📊</span>
                        Analytics
                    </button>
                    
                    <button
                        className="export-btn"
                        onClick={handleExportPosts}
                        title="Export Posts"
                    >
                        <span className="icon">📥</span>
                        Export
                    </button>
                    
                    <button className="create-post-btn" onClick={handleCreatePost}>
                        <span className="icon">+</span>
                        Create New Post
                    </button>
                    
                    <span className="last-refresh">
                        Last updated: {formatRelativeTime(lastRefresh)}
                    </span>
                </div>
            </div>

            {/* Stats Dashboard */}
            {stats && (
                <div className="stats-dashboard">
                    <div className="stat-card">
                        <h3>Total Posts</h3>
                        <p className="stat-number">{stats.totalPosts}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Published</h3>
                        <p className="stat-number">{stats.publishedPosts}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Drafts</h3>
                        <p className="stat-number">{stats.draftPosts}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Categories</h3>
                        <p className="stat-number">{categories.length}</p>
                    </div>
                </div>
            )}

            {/* Filters and Search */}
            <div className="admin-controls">
                <form className="search-form" onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Search posts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <button type="submit" className="search-btn">Search</button>
                </form>

                <div className="filters">
                    <select
                        value={selectedCategory}
                        onChange={(e) => {
                            setSelectedCategory(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="filter-select"
                    >
                        <option value="">All Categories</option>
                        {categories.map(category => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                            const [field, order] = e.target.value.split('-');
                            setSortBy(field);
                            setSortOrder(order);
                            setCurrentPage(1);
                        }}
                        className="filter-select"
                    >
                        <option value="created_at-desc">Newest First</option>
                        <option value="created_at-asc">Oldest First</option>
                        <option value="title-asc">Title A-Z</option>
                        <option value="title-desc">Title Z-A</option>
                        <option value="updated_at-desc">Recently Updated</option>
                    </select>
                </div>
            </div>

            {/* Bulk Actions Toolbar */}
            {showBulkActions && (
                <div className="bulk-actions-toolbar">
                    <div className="bulk-info">
                        <span>{selectedPosts.length} post{selectedPosts.length !== 1 ? 's' : ''} selected</span>
                    </div>
                    <div className="bulk-actions">
                        <button 
                            className="bulk-btn publish-btn"
                            onClick={() => handleBulkStatusChange('published')}
                            disabled={loading}
                        >
                            📢 Publish Selected
                        </button>
                        <button 
                            className="bulk-btn draft-btn"
                            onClick={() => handleBulkStatusChange('draft')}
                            disabled={loading}
                        >
                            📝 Move to Draft
                        </button>
                        <button 
                            className="bulk-btn delete-btn"
                            onClick={handleBulkDelete}
                            disabled={loading}
                        >
                            🗑️ Delete Selected
                        </button>
                        <button 
                            className="bulk-btn cancel-btn"
                            onClick={() => {
                                setSelectedPosts([]);
                                setShowBulkActions(false);
                            }}
                        >
                            ✕ Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Posts Table */}
            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={() => setError(null)} className="dismiss-error">✕</button>
                </div>
            )}

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading posts...</p>
                </div>
            ) : (
                <div className="posts-table-container">
                    <table className="posts-table">
                        <thead>
                            <tr>
                                <th className="checkbox-cell">
                                    <input
                                        type="checkbox"
                                        checked={posts.length > 0 && selectedPosts.length === posts.length}
                                        onChange={handleSelectAll}
                                        title="Select All"
                                    />
                                </th>
                                <th>Title</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Updated</th>
                                <th>Views</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {posts.map(post => (
                                <tr key={post.id} className={`${post.status === 'published' ? 'published' : 'draft'} ${selectedPosts.includes(post.id) ? 'selected' : ''}`}>
                                    <td className="checkbox-cell">
                                        <input
                                            type="checkbox"
                                            checked={selectedPosts.includes(post.id)}
                                            onChange={() => handleSelectPost(post.id)}
                                        />
                                    </td>
                                    <td className="post-title-cell">
                                        <div className="post-title-info">
                                            <h4>{post.title}</h4>
                                            <p className="post-excerpt">{post.excerpt}</p>
                                        </div>
                                    </td>
                                    <td>
                                        <span 
                                            className="category-badge enhanced"
                                            style={{ 
                                                backgroundColor: (post.category_color || '#6366f1') + '15',
                                                borderColor: (post.category_color || '#6366f1') + '40',
                                                color: post.category_color || '#6366f1'
                                            }}
                                        >
                                            <div 
                                                className="category-dot"
                                                style={{ backgroundColor: post.category_color || '#6366f1' }}
                                            ></div>
                                            {post.category_name || 'Uncategorized'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className={`status-toggle enhanced ${post.status === 'published' ? 'published' : 'draft'}`}
                                            onClick={() => handleTogglePublished(post)}
                                            disabled={loading}
                                        >
                                            <div className={`status-dot ${post.status === 'published' ? 'published' : 'draft'}`}></div>
                                            {post.status === 'published' ? 'Published' : 'Draft'}
                                        </button>
                                    </td>
                                    <td className="date-cell">
                                        <div className="date-info">
                                            <span className="date">{formatDate(post.created_at)}</span>
                                            <span className="time">{formatTime(post.created_at)}</span>
                                        </div>
                                    </td>
                                    <td className="date-cell">
                                        <div className="date-info">
                                            <span className="date">{formatDate(post.updated_at)}</span>
                                            <span className="time relative">{formatRelativeTime(post.updated_at)}</span>
                                        </div>
                                    </td>
                                    <td className="views-cell">
                                        <div className="view-count">
                                            <span className="count">{post.view_count || 0}</span>
                                            <span className="label">views</span>
                                            <svg className="view-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            {showAnalytics && postAnalytics[post.id] && (
                                                <div className="analytics-tooltip">
                                                    <small>Analytics loaded</small>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="actions-cell">
                                        <div className="post-actions">
                                            <button
                                                className="action-btn edit"
                                                onClick={() => handleEditPost(post)}
                                                title="Edit Post"
                                            >
                                                <span>✏️</span>
                                                <span>Edit</span>
                                            </button>
                                            {post.status === 'published' && (
                                                <a
                                                    href={`/#/blog/${post.slug}`}
                                                    target="_blank"
                                                    className="action-btn view"
                                                    title="View Post"
                                                >
                                                    <span>👁️</span>
                                                    <span>View</span>
                                                </a>
                                            )}
                                            <button
                                                className="action-btn duplicate"
                                                onClick={() => handleDuplicatePost(post)}
                                                title="Duplicate Post"
                                                disabled={loading}
                                            >
                                                <span>📋</span>
                                                <span>Copy</span>
                                            </button>
                                            {showAnalytics && (
                                                <button
                                                    className="action-btn analytics"
                                                    onClick={() => loadPostAnalytics(post.id)}
                                                    title="Load Analytics"
                                                >
                                                    <span>📊</span>
                                                    <span>Stats</span>
                                                </button>
                                            )}
                                            <button
                                                className="action-btn delete"
                                                onClick={() => handleDeletePost(post.id)}
                                                title="Delete Post"
                                            >
                                                <span>🗑️</span>
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {posts.length === 0 && (
                        <div className="no-posts">
                            <p>No posts found. Create your first post to get started!</p>
                        </div>
                    )}
                </div>
            )}

            {/* Analytics Section */}
            {showAnalytics && (
                <div className="analytics-section">
                    <div className="analytics-header">
                        <h3>Post Analytics Overview</h3>
                        <button 
                            onClick={() => setShowAnalytics(false)}
                            className="btn btn-secondary"
                        >
                            Hide Analytics
                        </button>
                    </div>
                    <div className="analytics-grid">
                        <div className="analytics-card">
                            <h4>Total Posts with Analytics</h4>
                            <div className="analytics-value">
                                {Object.keys(postAnalytics).length}
                            </div>
                        </div>
                        <div className="analytics-card">
                            <h4>Average Views</h4>
                            <div className="analytics-value">
                                {Object.keys(postAnalytics).length > 0 
                                    ? Math.round(Object.values(postAnalytics).reduce((sum, analytics) => sum + (analytics.views || 0), 0) / Object.keys(postAnalytics).length)
                                    : 0
                                }
                            </div>
                        </div>
                        <div className="analytics-card">
                            <h4>Total Engagement</h4>
                            <div className="analytics-value">
                                {Object.values(postAnalytics).reduce((sum, analytics) => sum + (analytics.engagement || 0), 0)}
                            </div>
                        </div>
                        <div className="analytics-card">
                            <h4>Analytics Last Updated</h4>
                            <div className="analytics-value">
                                {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="page-btn"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    
                    <div className="page-numbers">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                className={`page-btn ${page === currentPage ? 'active' : ''}`}
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                    
                    <button
                        className="page-btn"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Export Modal */}
            {showExportModal && (
                <ExportModal
                    isOpen={showExportModal}
                    posts={posts}
                    onClose={() => setShowExportModal(false)}
                />
            )}
            </main>
        </>
    );
};

// Blog Editor Component
const BlogEditor = ({ post, categories, onClose, blogAPI, imageProcessor }) => {
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        category_id: categories[0]?.id || '',
        featured_image: '',
        tags: '',
        status: 'draft',
        meta_title: '',
        meta_description: ''
    });
    const [saving, setSaving] = useState(false);
    const [processingImages, setProcessingImages] = useState(false);
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [loading, setLoading] = useState(false);

    // Load post data when editing
    useEffect(() => {
        if (post) {
            console.log('Loading post data for editing:', post);
            console.log('Post meta_title:', post.meta_title);
            console.log('Post meta_description:', post.meta_description);
            setLoading(true);
            setFormData({
                title: post.title || '',
                slug: post.slug || '',
                excerpt: post.excerpt || '',
                content: post.content || '',
                category_id: post.category_id || (categories[0]?.id || ''),
                featured_image: post.featured_image_url || '',
                tags: Array.isArray(post.tags) ? post.tags.join(', ') : (post.tags || ''),
                status: post.status || 'draft',
                meta_title: post.meta_title || '',
                meta_description: post.meta_description || ''
            });
            setSlugManuallyEdited(!!post.slug);
            setLoading(false);
        } else {
            // Reset form for new post
            setFormData({
                title: '',
                slug: '',
                excerpt: '',
                content: '',
                category_id: categories[0]?.id || '',
                featured_image: '',
                tags: '',
                status: 'draft',
                meta_title: '',
                meta_description: ''
            });
            setSlugManuallyEdited(false);
        }
    }, [post, categories]);

    // Auto-generate slug from title
    useEffect(() => {
        if (!slugManuallyEdited && formData.title) {
            const autoSlug = formData.title
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
            setFormData(prev => ({ ...prev, slug: autoSlug }));
        }
    }, [formData.title, slugManuallyEdited]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        if (field === 'slug') {
            setSlugManuallyEdited(true);
        }
    };

    const handleContentChange = async (content) => {
        setProcessingImages(true);
        try {
            // Process any image URLs in the content
            const processedContent = await imageProcessor.processContentImages(content);
            setFormData(prev => ({ ...prev, content: processedContent }));
        } catch (err) {
            console.error('Error processing images:', err);
            setFormData(prev => ({ ...prev, content }));
        } finally {
            setProcessingImages(false);
        }
    };

    const handleSave = async (publishNow = false) => {
        // Validation
        if (!formData.title.trim()) {
            alert('Please enter a title');
            return;
        }

        if (!formData.content.trim()) {
            alert('Please enter some content');
            return;
        }

        // Prevent multiple simultaneous saves
        if (saving) {
            console.log('Save already in progress, ignoring duplicate request');
            return;
        }

        setSaving(true);
        console.log(`Starting ${publishNow ? 'publish' : 'save'} operation...`);
        
        try {
            // Verify user authentication before proceeding
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                throw new Error('Authentication required. Please sign in again.');
            }

            // Verify admin status
            const isUserAdmin = await BlogAPI.isAdmin();
            if (!isUserAdmin) {
                throw new Error('Admin privileges required to save posts.');
            }

            // Clean and format content
            const cleanContent = formData.content
                .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
                .trim();

            const postData = {
                ...formData,
                content: cleanContent,
                featured_image_url: formData.featured_image, // Map to correct database field
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                status: publishNow ? 'published' : (formData.status || 'draft'),
                // Ensure meta fields are included
                meta_title: formData.meta_title || formData.title,
                meta_description: formData.meta_description || formData.excerpt
            };
            delete postData.featured_image; // Remove the form field name

            console.log('Saving post data:', { ...postData, content: '[content truncated]' });

            let result;
            const startTime = Date.now();
            
            if (post) {
                console.log('Updating existing post:', post.id);
                result = await Promise.race([
                    BlogAPI.updatePost(post.id, postData),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Save operation timed out')), 30000)
                    )
                ]);
            } else {
                console.log('Creating new post');
                result = await Promise.race([
                    BlogAPI.createPost(postData),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Save operation timed out')), 30000)
                    )
                ]);
            }

            const duration = Date.now() - startTime;
            console.log(`Save operation completed in ${duration}ms`);

            if (!result) {
                throw new Error('No response received from server');
            }

            if (result.error) {
                throw new Error(result.error.message || 'Failed to save post');
            }

            console.log('Post saved successfully:', result.id);
            alert(publishNow ? 'Post published successfully!' : 'Post saved as draft!');
            onClose();
        } catch (err) {
            console.error('Error saving post:', err);
            
            // Provide more specific error messages
            let errorMessage = err.message;
            if (err.message.includes('timeout')) {
                errorMessage = 'The save operation timed out. Please check your connection and try again.';
            } else if (err.message.includes('Authentication')) {
                errorMessage = 'Please sign in again to continue.';
            } else if (err.message.includes('Admin privileges')) {
                errorMessage = 'You need admin privileges to save posts.';
            }
            
            alert(`Failed to ${publishNow ? 'publish' : 'save'} post: ${errorMessage}`);
        } finally {
            setSaving(false);
            console.log('Save operation finished, saving state reset');
        }
    };

    if (loading) {
        return (
            <div className="editor-modal">
                <div className="editor-container">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading post data...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="editor-modal">
            <div className="editor-container">
                <div className="editor-header">
                    <h2>{post ? 'Edit Post' : 'Create New Post'}</h2>
                    <button className="close-btn" onClick={onClose} disabled={saving}>
                        ×
                    </button>
                </div>

                <div className="editor-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="title">Title *</label>
                            <input
                                id="title"
                                type="text"
                                value={formData.title}
                                onChange={(e) => handleInputChange('title', e.target.value)}
                                placeholder="Enter post title..."
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="slug">URL Slug</label>
                            <input
                                id="slug"
                                type="text"
                                value={formData.slug}
                                onChange={(e) => handleInputChange('slug', e.target.value)}
                                placeholder="url-friendly-slug"
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="category">Category</label>
                            <select
                                id="category"
                                value={formData.category_id}
                                onChange={(e) => handleInputChange('category_id', e.target.value)}
                                className="form-select"
                            >
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="status">Status</label>
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(e) => handleInputChange('status', e.target.value)}
                                className="form-select status-select"
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                            </select>
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="excerpt">Excerpt</label>
                            <textarea
                                id="excerpt"
                                value={formData.excerpt}
                                onChange={(e) => handleInputChange('excerpt', e.target.value)}
                                placeholder="Brief description of the post..."
                                className="form-textarea"
                                rows="3"
                            />
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="featured-image">Featured Image URL</label>
                            <input
                                id="featured-image"
                                type="url"
                                value={formData.featured_image}
                                onChange={(e) => handleInputChange('featured_image', e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="form-input"
                            />
                            {formData.featured_image && (
                                <div className="image-preview" style={{marginTop: '0.5rem'}}>
                                    <img 
                                        src={formData.featured_image} 
                                        alt="Featured image preview" 
                                        style={{maxWidth: '200px', maxHeight: '120px', borderRadius: '8px', objectFit: 'cover'}}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="tags">Tags</label>
                            <input
                                id="tags"
                                type="text"
                                value={formData.tags}
                                onChange={(e) => handleInputChange('tags', e.target.value)}
                                placeholder="tag1, tag2, tag3"
                                className="form-input"
                            />
                            <small style={{color: 'var(--text-secondary)', fontSize: '0.8rem'}}>Separate tags with commas</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="meta-title">SEO Title</label>
                            <input
                                id="meta-title"
                                type="text"
                                value={formData.meta_title}
                                onChange={(e) => handleInputChange('meta_title', e.target.value)}
                                placeholder="SEO optimized title..."
                                className="form-input"
                            />
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="meta-description">SEO Description</label>
                            <textarea
                                id="meta-description"
                                value={formData.meta_description}
                                onChange={(e) => handleInputChange('meta_description', e.target.value)}
                                placeholder="SEO meta description..."
                                className="form-textarea"
                                rows="2"
                            />
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="content">Content *</label>
                            {processingImages && (
                                <div style={{padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '8px', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>
                                    Processing images... Please wait.
                                </div>
                            )}
                            <ContentEditor
                                value={formData.content}
                                onChange={handleContentChange}
                                disabled={processingImages}
                            />
                            <MarkdownGuide />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button 
                            className="form-btn secondary" 
                            onClick={onClose} 
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button 
                            className="form-btn secondary" 
                            onClick={() => handleSave(false)}
                            disabled={saving || processingImages}
                        >
                            {saving ? 'Saving...' : 'Save Draft'}
                        </button>
                        <button 
                            className="form-btn primary" 
                            onClick={() => handleSave(true)}
                            disabled={saving || processingImages}
                        >
                            {saving ? 'Publishing...' : 'Publish'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Simple Content Editor Component
const ContentEditor = ({ value, onChange, disabled }) => {
    const [isPreview, setIsPreview] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [showMovieSearch, setShowMovieSearch] = useState(false);
    const [movieSearchQuery, setMovieSearchQuery] = useState('');
    const [movieSearchResults, setMovieSearchResults] = useState([]);
    const [searchingMovies, setSearchingMovies] = useState(false);

    const handleChange = (e) => {
        if (!disabled) {
            onChange(e.target.value);
        }
    };

    const insertMarkdown = (before, after = '') => {
        const textarea = document.getElementById('content-editor');
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
        onChange(newText);
        
        // Restore cursor position
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + before.length, end + before.length);
        }, 0);
    };

    const insertTemplate = (template) => {
        const templates = {
            table: '| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |',
            codeblock: '```javascript\n// Your code here\nconsole.log("Hello World!");\n```',
            quote: '> This is a blockquote\n> It can span multiple lines',
            list: '- Item 1\n- Item 2\n- Item 3',
            numberedList: '1. First item\n2. Second item\n3. Third item'
        };
        
        const textarea = document.getElementById('content-editor');
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const newText = value.substring(0, start) + templates[template] + value.substring(start);
        onChange(newText);
        
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + templates[template].length, start + templates[template].length);
        }, 0);
    };

    const searchMovies = async (query) => {
        if (!query.trim()) return;
        
        setSearchingMovies(true);
        try {
            // Import API_BASE_URL at the top of the file
            const { API_BASE_URL } = await import('../config.js');
            const response = await fetch(`${API_BASE_URL}/tmdb/search/movie?query=${encodeURIComponent(query)}&language=en-US`);
            const data = await response.json();
            setMovieSearchResults(data.results || []);
        } catch (error) {
            console.error('Movie search error:', error);
            setMovieSearchResults([]);
        } finally {
            setSearchingMovies(false);
        }
    };

    const insertMovieLink = (movie) => {
        const movieTitle = movie.title || movie.name;
        const movieUrl = `/movie/${movie.id}`; // Remove the # to avoid duplication
        const linkText = `[${movieTitle}](${movieUrl})`;
        
        const textarea = document.getElementById('content-editor');
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const newText = value.substring(0, start) + linkText + value.substring(start);
        onChange(newText);
        
        // Close modal and reset
        setShowMovieSearch(false);
        setMovieSearchQuery('');
        setMovieSearchResults([]);
        
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + linkText.length, start + linkText.length);
        }, 0);
    };

    const renderPreview = (content) => {
        if (!content) return '';
        
        // Enhanced markdown rendering
        return content
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Headings
            .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            // Images
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />')
            // Blockquotes
            .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
            // Unordered lists
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            // Ordered lists
            .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
            // Horizontal rule
            .replace(/^---$/gim, '<hr>')
            // Line breaks
            .replace(/\n/g, '<br>');
    };

    return (
        <div className={`content-editor ${fullscreen ? 'fullscreen' : ''}`}>
            <div className="editor-toolbar">
                <div className="toolbar-group">
                    <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('**', '**')} title="Bold">
                        <span>𝐁</span>
                    </button>
                    <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('*', '*')} title="Italic">
                        <span>𝐼</span>
                    </button>
                    <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('`', '`')} title="Inline Code">
                        <span>&lt;/&gt;</span>
                    </button>
                </div>
                
                <div className="toolbar-divider"></div>
                
                <div className="toolbar-group">
                    <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('# ')} title="Heading 1">
                        <span>H1</span>
                    </button>
                    <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('## ')} title="Heading 2">
                        <span>H2</span>
                    </button>
                    <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('### ')} title="Heading 3">
                        <span>H3</span>
                    </button>
                </div>
                
                <div className="toolbar-divider"></div>
                
                <div className="toolbar-group">
                    <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('[', '](url)')} title="Link">
                        <span>🔗</span>
                    </button>
                    <button type="button" className="toolbar-btn" onClick={() => setShowMovieSearch(true)} title="Add Movie Link">
                        <span>🎬</span>
                    </button>
                    <button type="button" className="toolbar-btn" onClick={() => insertMarkdown('![alt](', ')')} title="Image">
                        <span>🖼️</span>
                    </button>
                    <button type="button" className="toolbar-btn" onClick={() => insertTemplate('quote')} title="Quote">
                        <span>❝</span>
                    </button>
                </div>
                
                <div className="toolbar-divider"></div>
                
                <div className="toolbar-group">
                    <button type="button" className="toolbar-btn" onClick={() => insertTemplate('list')} title="Bullet List">
                        <span>•</span>
                    </button>
                    <button type="button" className="toolbar-btn" onClick={() => insertTemplate('numberedList')} title="Numbered List">
                        <span>1.</span>
                    </button>
                    <button type="button" className="toolbar-btn" onClick={() => insertTemplate('table')} title="Table">
                        <span>⊞</span>
                    </button>
                    <button type="button" className="toolbar-btn" onClick={() => insertTemplate('codeblock')} title="Code Block">
                        <span>{ }</span>
                    </button>
                </div>
                
                <div className="toolbar-divider"></div>
                
                <div className="toolbar-group">
                    <button type="button" className="toolbar-btn" onClick={() => setFullscreen(!fullscreen)} title="Toggle Fullscreen">
                        <span>{fullscreen ? '⤓' : '⤢'}</span>
                    </button>
                </div>
                
                <div className="toolbar-divider"></div>
                
                <button 
                    type="button" 
                    className={`toolbar-btn ${isPreview ? 'active' : ''}`}
                    onClick={() => setIsPreview(!isPreview)}
                    title="Toggle Preview"
                >
                    <span>{isPreview ? '✏️' : '👁️'}</span>
                    <span>{isPreview ? 'Edit' : 'Preview'}</span>
                </button>
            </div>
            
            <div className="editor-content">
                {!isPreview ? (
                    <textarea
                        id="content-editor"
                        className="editor-textarea"
                        value={value}
                        onChange={handleChange}
                        disabled={disabled}
                        placeholder="Write your blog post content in Markdown...\n\n# Example Heading\n\nThis is a paragraph with **bold** and *italic* text.\n\n- Bullet point 1\n- Bullet point 2\n\n```javascript\nconst example = 'code block';\n```\n\n> This is a blockquote"
                    />
                ) : (
                    <div 
                        className="editor-preview"
                        dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
                    />
                )}
            </div>
            
            {/* Movie Search Modal */}
            {showMovieSearch && (
                <div className="movie-search-modal">
                    <div className="movie-search-content">
                        <div className="movie-search-header">
                            <h3>🎬 Search Movies</h3>
                            <button 
                                className="close-btn" 
                                onClick={() => {
                                    setShowMovieSearch(false);
                                    setMovieSearchQuery('');
                                    setMovieSearchResults([]);
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="movie-search-form">
                            <input
                                type="text"
                                placeholder="Search for a movie..."
                                value={movieSearchQuery}
                                onChange={(e) => setMovieSearchQuery(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        searchMovies(movieSearchQuery);
                                    }
                                }}
                                autoFocus
                            />
                            <button 
                                onClick={() => searchMovies(movieSearchQuery)}
                                disabled={searchingMovies || !movieSearchQuery.trim()}
                            >
                                {searchingMovies ? 'Searching...' : 'Search'}
                            </button>
                        </div>
                        
                        <div className="movie-search-results">
                            {searchingMovies && (
                                <div className="loading-message">Searching movies...</div>
                            )}
                            
                            {movieSearchResults.length > 0 && (
                                <div className="movie-results-list">
                                    {movieSearchResults.map((movie) => (
                                        <div 
                                            key={movie.id} 
                                            className="movie-result-item"
                                            onClick={() => insertMovieLink(movie)}
                                        >
                                            <div className="movie-poster">
                                                {movie.poster_path ? (
                                                    <img 
                                                        src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`} 
                                                        alt={movie.title}
                                                    />
                                                ) : (
                                                    <div className="no-poster">🎬</div>
                                                )}
                                            </div>
                                            <div className="movie-info">
                                                <h4>{movie.title}</h4>
                                                <p className="movie-year">
                                                    {movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown'}
                                                </p>
                                                <p className="movie-overview">
                                                    {movie.overview ? movie.overview.substring(0, 150) + '...' : 'No description available'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {!searchingMovies && movieSearchQuery && movieSearchResults.length === 0 && (
                                <div className="no-results">No movies found. Try a different search term.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const MarkdownGuide = () => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="markdown-guide">
            <button 
                type="button" 
                className="guide-toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                📖 Markdown Guide
            </button>
            
            {isOpen && (
                <div className="guide-content">
                    <h3>Markdown Quick Reference</h3>
                    <div className="guide-grid">
                        <div className="guide-item">
                            <strong>Headers:</strong>
                            <code># H1 ## H2 ### H3</code>
                        </div>
                        <div className="guide-item">
                            <strong>Emphasis:</strong>
                            <code>**bold** *italic*</code>
                        </div>
                        <div className="guide-item">
                            <strong>Links:</strong>
                            <code>[text](url)</code>
                        </div>
                        <div className="guide-item">
                            <strong>Images:</strong>
                            <code>![alt](url)</code>
                        </div>
                        <div className="guide-item">
                            <strong>Code:</strong>
                            <code>`inline` ```block```</code>
                        </div>
                        <div className="guide-item">
                            <strong>Lists:</strong>
                            <code>- item or 1. item</code>
                        </div>
                        <div className="guide-item">
                            <strong>Quote:</strong>
                            <code>&gt; blockquote</code>
                        </div>
                        <div className="guide-item">
                            <strong>Table:</strong>
                            <code>| col1 | col2 |</code>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Export functionality
const ExportModal = ({ isOpen, onClose, posts }) => {
    const [exportFormat, setExportFormat] = useState('json');
    const [selectedPosts, setSelectedPosts] = useState([]);
    const [exporting, setExporting] = useState(false);
    
    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedPosts([]);
            setExporting(false);
        }
    }, [isOpen]);
    
    const handleExport = async () => {
        setExporting(true);
        try {
            const postsToExport = selectedPosts.length > 0 
                ? posts.filter(post => selectedPosts.includes(post.id))
                : posts;
            
            let content, filename, mimeType;
            
            switch (exportFormat) {
                case 'json':
                    content = JSON.stringify(postsToExport, null, 2);
                    filename = `blog-posts-${new Date().toISOString().split('T')[0]}.json`;
                    mimeType = 'application/json';
                    break;
                case 'csv':
                    const headers = ['Title', 'Slug', 'Status', 'Category', 'Created', 'Updated'];
                    const rows = postsToExport.map(post => [
                        post.title || '',
                        post.slug || '',
                        post.status || '',
                        post.category_name || 'Uncategorized',
                        post.created_at || '',
                        post.updated_at || ''
                    ]);
                    content = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
                    filename = `blog-posts-${new Date().toISOString().split('T')[0]}.csv`;
                    mimeType = 'text/csv';
                    break;
                case 'markdown':
                    content = postsToExport.map(post => 
                        `# ${post.title || 'Untitled'}\n\n**Status:** ${post.status || 'draft'}\n**Created:** ${post.created_at || 'Unknown'}\n**Category:** ${post.category_name || 'Uncategorized'}\n\n${post.excerpt ? `**Excerpt:** ${post.excerpt}\n\n` : ''}${post.content || 'No content'}\n\n---\n\n`
                    ).join('');
                    filename = `blog-posts-${new Date().toISOString().split('T')[0]}.md`;
                    mimeType = 'text/markdown';
                    break;
            }
            
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            onClose();
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error.message);
        } finally {
            setExporting(false);
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="export-modal">
            <div className="export-content">
                <div className="export-header">
                    <h3>Export Blog Posts</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                
                <div className="export-form">
                    <div className="form-group">
                        <label>Export Format:</label>
                        <select 
                            value={exportFormat} 
                            onChange={(e) => setExportFormat(e.target.value)}
                            className="form-select"
                        >
                            <option value="json">JSON</option>
                            <option value="csv">CSV</option>
                            <option value="markdown">Markdown</option>
                        </select>
                    </div>
                    
                    <div className="form-group">
                        <label>Posts to Export:</label>
                        <div className="export-options">
                            <label className="checkbox-label">
                                <input 
                                    type="radio" 
                                    name="exportSelection" 
                                    checked={selectedPosts.length === 0}
                                    onChange={() => setSelectedPosts([])}
                                />
                                All Posts ({posts.length})
                            </label>
                            <label className="checkbox-label">
                                <input 
                                    type="radio" 
                                    name="exportSelection" 
                                    checked={selectedPosts.length > 0}
                                    onChange={() => setSelectedPosts(posts.map(p => p.id))}
                                />
                                Selected Posts
                            </label>
                        </div>
                    </div>
                    
                    <div className="export-actions">
                        <button 
                            className="form-btn secondary" 
                            onClick={onClose}
                            disabled={exporting}
                        >
                            Cancel
                        </button>
                        <button 
                            className="form-btn primary" 
                            onClick={handleExport}
                            disabled={exporting}
                        >
                            {exporting ? 'Exporting...' : 'Export'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Updated toolbar with export functionality
const AdminToolbar = ({ onCreatePost, onRefresh, onExport, refreshing, stats }) => {
    return (
        <div className="admin-toolbar">
            <div className="toolbar-left">
                <div className="admin-stats">
                    {stats && (
                        <>
                            <div className="stat-item">
                                <span className="stat-number">{stats.total || 0}</span>
                                <span className="stat-label">Total Posts</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">{stats.published || 0}</span>
                                <span className="stat-label">Published</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">{stats.drafts || 0}</span>
                                <span className="stat-label">Drafts</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            <div className="toolbar-right">
                <button 
                    className="refresh-btn"
                    onClick={onRefresh}
                    disabled={refreshing}
                    title="Refresh Posts"
                >
                    <span className={`icon ${refreshing ? 'spinning' : ''}`}>🔄</span>
                    <span>Refresh</span>
                </button>
                
                <button 
                    className="export-btn"
                    onClick={onExport}
                    title="Export Posts"
                >
                    <span className="icon">📥</span>
                    <span>Export</span>
                </button>
                
                <button 
                    className="create-post-btn"
                    onClick={onCreatePost}
                >
                    <span className="icon">✏️</span>
                    <span>Create Post</span>
                </button>
            </div>
        </div>
    );
};

export default BlogAdmin;