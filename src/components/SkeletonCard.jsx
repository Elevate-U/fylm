import { h } from 'preact';
import './SkeletonCard.css';

const SkeletonCard = () => (
    <div class="skeleton-card">
        <div class="skeleton-image"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text short"></div>
    </div>
);

export default SkeletonCard;