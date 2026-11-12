'use client';

import React, { useState, useMemo } from 'react';
import MathRenderer from '@/components/MathRenderer';
import { MindMapNode, countMindMapNodes } from '@/lib/lecture-utils';
import {
  Network,
  ChevronDown,
  ChevronLeft,
  Search,
  Maximize2,
  Minimize2,
  Sparkles,
  GitBranch,
  CircleDot,
  X,
} from 'lucide-react';

interface MindMapViewerProps {
  data: MindMapNode | null;
  lectureTitle?: string;
  isGirls?: boolean;
  isDark?: boolean;
}

function collectAllExpandableIds(node: MindMapNode | null): Set<string> {
  const ids = new Set<string>();
  const walk = (n: MindMapNode | null) => {
    if (!n) return;
    if (n.children.length > 0) {
      ids.add(n.id);
      n.children.forEach(walk);
    }
  };
  walk(node);
  return ids;
}

function collectDefaultExpandedIds(node: MindMapNode | null, maxInitialDepth = 1): Set<string> {
  const ids = new Set<string>();
  const walk = (n: MindMapNode | null, depth: number) => {
    if (!n) return;
    if (depth <= maxInitialDepth && n.children.length > 0) {
      ids.add(n.id);
      n.children.forEach((c) => walk(c, depth + 1));
    }
  };
  walk(node, 0);
  return ids;
}

function filterMindMapTree(node: MindMapNode, query: string): MindMapNode | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return node;

  const selfMatches = node.name.toLowerCase().includes(normalizedQuery);
  const filteredChildren = node.children
    .map((child) => filterMindMapTree(child, normalizedQuery))
    .filter((c): c is MindMapNode => c !== null);

  if (selfMatches || filteredChildren.length > 0) {
    return {
      ...node,
      children: selfMatches && filteredChildren.length === 0 ? node.children : filteredChildren,
    };
  }
  return null;
}

export default function MindMapViewer({
  data,
  lectureTitle,
  isGirls = false,
  isDark = false,
}: MindMapViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    collectDefaultExpandedIds(data, 1)
  );

  // Sync default expanded nodes if root data changes
  React.useEffect(() => {
    setExpandedIds(collectDefaultExpandedIds(data, 1));
  }, [data]);

  const totalNodes = useMemo(() => countMindMapNodes(data), [data]);

  const visibleTree = useMemo(() => {
    if (!data) return null;
    if (!searchQuery.trim()) return data;
    return filterMindMapTree(data, searchQuery);
  }, [data, searchQuery]);

  const effectiveExpandedIds = useMemo(() => {
    if (searchQuery.trim() && visibleTree) {
      return collectAllExpandableIds(visibleTree);
    }
    return expandedIds;
  }, [searchQuery, visibleTree, expandedIds]);

  const toggleNode = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    if (data) setExpandedIds(collectAllExpandableIds(data));
  };

  const handleCollapseAll = () => {
    if (data) setExpandedIds(new Set([data.id]));
  };

  if (!data) {
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
        className="p-8 sm:p-12 rounded-3xl border text-center space-y-3"
      >
        <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-teal-500/10 text-teal-500">
          <Network className="w-6 h-6" />
        </div>
        <h3 className="text-base sm:text-lg font-black" style={{ color: 'var(--text-primary)' }}>
          الخريطة الذهنية غير متوفرة لهذه المحاضرة بعد
        </h3>
        <p className="text-xs sm:text-sm font-medium max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
          يمكنك المذاكرة من ملخص الزتونة أو الكروت التفاعلية ريثما يتم توليد الخريطة الذهنية.
        </p>
      </div>
    );
  }

  const getDepthStyles = (depth: number) => {
    if (isGirls) {
      const palettes = [
        {
          bg: isDark ? 'rgba(236, 72, 153, 0.16)' : '#FDF2F8',
          border: isDark ? 'rgba(236, 72, 153, 0.4)' : '#FBCFE8',
          accent: '#EC4899',
        },
        {
          bg: isDark ? 'rgba(168, 85, 247, 0.14)' : '#FAF5FF',
          border: isDark ? 'rgba(168, 85, 247, 0.35)' : '#E9D5FF',
          accent: '#A855F7',
        },
        {
          bg: isDark ? 'rgba(244, 114, 182, 0.1)' : '#FFF1F2',
          border: isDark ? 'rgba(244, 114, 182, 0.25)' : '#FECDD3',
          accent: '#F43F5E',
        },
        {
          bg: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
          border: isDark ? 'rgba(255, 255, 255, 0.12)' : '#F3E8FF',
          accent: '#D946EF',
        },
      ];
      return palettes[Math.min(depth, palettes.length - 1)];
    }

    const palettes = [
      {
        bg: isDark ? 'rgba(20, 184, 166, 0.16)' : '#F0FDFA',
        border: isDark ? 'rgba(45, 212, 191, 0.45)' : '#99F6E4',
        accent: '#14B8A6',
      },
      {
        bg: isDark ? 'rgba(6, 182, 212, 0.13)' : '#ECFEFF',
        border: isDark ? 'rgba(34, 211, 238, 0.35)' : '#A5F3FC',
        accent: '#06B6D4',
      },
      {
        bg: isDark ? 'rgba(99, 102, 241, 0.11)' : '#EEF2FF',
        border: isDark ? 'rgba(129, 140, 248, 0.3)' : '#C7D2FE',
        accent: '#6366F1',
      },
      {
        bg: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
        border: isDark ? 'rgba(148, 163, 184, 0.2)' : '#E2E8F0',
        accent: '#10B981',
      },
    ];
    return palettes[Math.min(depth, palettes.length - 1)];
  };

  const renderNode = (node: MindMapNode, depth: number): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = effectiveExpandedIds.has(node.id);
    const stylePalette = getDepthStyles(depth);

    return (
      <div key={node.id} className="relative" data-testid={`mindmap-node-${node.id}`}>
        <div
          onClick={() => hasChildren && toggleNode(node.id)}
          style={{
            backgroundColor: stylePalette.bg,
            borderColor: stylePalette.border,
          }}
          className={`group rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 ${
            hasChildren ? 'cursor-pointer hover:shadow-md' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div
                style={{
                  backgroundColor: `${stylePalette.accent}20`,
                  color: stylePalette.accent,
                }}
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              >
                {depth === 0 ? (
                  <Sparkles className="w-4 h-4" />
                ) : hasChildren ? (
                  <GitBranch className="w-3.5 h-3.5" />
                ) : (
                  <CircleDot className="w-3.5 h-3.5" />
                )}
              </div>

              <div
                className={`min-w-0 flex-1 leading-relaxed ${
                  depth === 0
                    ? 'text-base sm:text-lg font-black'
                    : depth === 1
                    ? 'text-sm sm:text-base font-extrabold'
                    : 'text-xs sm:text-sm font-bold'
                }`}
                style={{ color: 'var(--text-primary)' }}
              >
                <MathRenderer text={node.name} />
              </div>
            </div>

            {hasChildren && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
                aria-label={isExpanded ? 'طي الفرع' : 'توسيع الفرع'}
                style={{
                  backgroundColor: `${stylePalette.accent}18`,
                  color: stylePalette.accent,
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-black inline-flex items-center gap-1 shrink-0 transition-transform cursor-pointer"
              >
                <span className="font-mono">{node.children.length}</span>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronLeft className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div
            style={{ borderColor: stylePalette.border }}
            className="mr-4 sm:mr-6 pr-3 sm:pr-4 mt-2.5 space-y-2.5 border-r-2 transition-all"
          >
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header & Controls Bar */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
        className="p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">{isGirls ? '🎀' : '🧠'}</span>
            <h3 className="text-sm sm:text-base font-black" style={{ color: 'var(--text-primary)' }}>
              الخريطة الذهنية التفاعلية للمحاضرة
            </h3>
            <span
              style={{
                backgroundColor: isGirls ? 'rgba(236, 72, 153, 0.15)' : 'rgba(20, 184, 166, 0.15)',
                color: isGirls ? '#EC4899' : '#14B8A6',
              }}
              className="text-[11px] font-black px-2.5 py-0.5 rounded-full font-mono"
            >
              {totalNodes} مفهوم مترابط
            </span>
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {lectureTitle
              ? `اضغط على أي فرع في "${lectureTitle}" لتوسيع القوانين والتفريعات المرتبطة به`
              : 'اضغط على أي فرع لتوسيع القوانين والتفريعات المرتبطة به'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExpandAll}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            className="px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-teal-500" />
            <span>توسيع الكل</span>
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            className="px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>طي الكل</span>
          </button>
        </div>
      </div>

      {/* Search Filter Input */}
      <div className="relative">
        <Search
          className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث داخل فروع الخريطة أو القوانين..."
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
          className="w-full pr-10 pl-9 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="مسح البحث"
            className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tree Content */}
      {visibleTree ? (
        <div className="space-y-3">{renderNode(visibleTree, 0)}</div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          className="p-8 rounded-2xl border text-center text-xs sm:text-sm font-bold"
        >
          لا توجد فروع مطابقة لعبارة البحث &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  );
}
