# Changelog

## [1.0.0] - 2025

### Added
- Core: GemmaEngine (Gemma 3 27B/12B/4B/CodeGemma), KnowledgeGraph (ChromaDB + TF-IDF fallback), MemoryManager, Router, VoiceInterface
- M1 Self-Learner: Universal ingestion (URL/PDF/audio/text), SkillExtractor, KnowledgeBuilder, Teacher (quiz/flashcards/study plans/hypotheses)
- M2 Research Accelerator: PaperParser, HypothesisGenerator, ConnectionFinder, Ranker
- M3 AI Builder: ProblemParser, ArchDesigner, CodeGenerator, Deployer
- M4 Time Reconstruct: HistoryReconstructor, FutureProjector, VisualAnalyzer, TimelineRenderer
- M5 Intuition Engine: BayesianReasoner, GapFiller, CrossModuleGlue, Explainer
- M6 Reality Sim: WorldObserver, SimRunner, ResultsAnalyzer, CodeSynthesizer
- FastAPI REST API + WebSocket streaming
- React frontend (Dashboard, ModulePanel, KnowledgeGraph, Timeline, VoiceInput)
- Admin panel + Global panel
- Celery async task queue
- Docker + k8s + Cloud Run deployment configs
- Full pytest test suite (unit + integration)
