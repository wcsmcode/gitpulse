import React, { useState } from 'react';
import { X, Sparkles, FolderGit2, AlertCircle, ArrowUpCircle, ArrowRightCircle, ArrowDownCircle, Plus } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { IssuePriority } from '../types';

export const CreateIssueModal: React.FC = () => {
  const {
    isCreateIssueModalOpen,
    closeCreateIssueModal,
    repositories,
    allTags,
    createNewIssue,
  } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('MEDIUM');
  const [bountyPoints, setBountyPoints] = useState<number>(150);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(
    repositories.length > 0 ? repositories[0].id : null
  );
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCreateIssueModalOpen) return null;

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createNewIssue({
        title: title.trim(),
        description: description.trim(),
        priority,
        bounty_points: Number(bountyPoints) || 100,
        repositoryId: selectedRepoId,
        tagIds: selectedTagIds,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setBountyPoints(150);
      setSelectedTagIds([]);
      closeCreateIssueModal();
    } catch (err) {
      console.error('Error creating issue:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Create New Bounty Issue</h3>
              <p className="text-[11px] text-zinc-400">Attach XP points and dispatch to your workspace board</p>
            </div>
          </div>
          <button
            onClick={closeCreateIssueModal}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Repository Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-zinc-400" />
              Target Repository
            </label>
            <select
              value={selectedRepoId ?? ''}
              onChange={(e) => setSelectedRepoId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-mono"
            >
              <option value="">No specific repository / Internal task</option>
              {repositories.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.name} ({repo.language || 'Codebase'}) ★ {repo.stars}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Issue Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Fix PostgreSQL N+1 query bottleneck in workspace API"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Markdown Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Description (Markdown supported)
            </label>
            <textarea
              rows={4}
              placeholder="Provide context, reproduction steps, technical acceptance criteria, or PR requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
            />
          </div>

          {/* Priority & Bounty Points Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Priority Level
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as IssuePriority[]).map((p) => {
                  const isSelected = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                        isSelected
                          ? 'bg-zinc-800 border-zinc-600 text-zinc-100 ring-1 ring-zinc-500'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {p === 'CRITICAL' && <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      {p === 'HIGH' && <ArrowUpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {p === 'MEDIUM' && <ArrowRightCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                      {p === 'LOW' && <ArrowDownCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                      <span className="text-[11px] font-mono">{p}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bounty Points (XP) */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Sparkles className="w-3 h-3" /> Bounty Points (XP)
                </span>
                <span className="font-mono text-xs font-bold text-emerald-400">+{bountyPoints} XP</span>
              </label>
              <input
                type="number"
                min={10}
                step={10}
                value={bountyPoints}
                onChange={(e) => setBountyPoints(Math.max(10, parseInt(e.target.value) || 0))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-2"
              />
              <div className="flex gap-1.5">
                {[50, 100, 250, 500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setBountyPoints(amt)}
                    className="flex-1 py-1 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-[10px] font-mono text-zinc-400 hover:text-emerald-400 transition"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Issue Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => {
                  const isChecked = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono transition border ${
                        isChecked
                          ? 'bg-indigo-950/80 border-indigo-700 text-indigo-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      #{tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeCreateIssueModal}
              className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition shadow-sm hover:shadow disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-950" />
              {isSubmitting ? 'Creating...' : 'Create Bounty Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
