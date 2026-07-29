---
translationKey: context-not-control
language: zh
title: "Context, Not Control：管理 Agent Workforce"
description: 当 AI 成为默认执行者，人的工作从推动每一步，转向定义目标、准备 context、设计 evaluation，并管理一支持续工作的 agent workforce。
publishedAt: 2026-07-29
artwork: /media/notes/context-not-control.svg
artworkAlt: 目标、context 和 evaluation 进入持续工作的 agent workforce，再返回 evidence 与最终结果
tags:
  - ai
  - agents
  - engineering
  - workflow
  - infrastructure
---

> **核心观点**
>
> 当 AI 可以承担越来越完整的任务，人的工作重心会从持续推动 execution，转向定义目标、设计 evaluation、准备 context 和判断最终结果。AI-native 的关键，是把 AI 设成默认 executor，再围绕它构建一套可以持续执行、观察结果、修正偏差并沉淀经验的系统。
>
> Agent 同时降低了 integration 和 glue work 的成本。软件系统因此可以更多地组合 atomic primitives，由公司掌握 orchestration、context、evaluation 和 policy，让 GitHub、cloud sandbox 与其他工具成为可替换、可复用的能力层。

过去一年，我使用 coding agent 的方式发生了很大变化。最早的时候，我把它当成一个随时可以对话的程序员：告诉它下一步做什么，看着它修改代码，方向偏了再拉回来。代码已经有相当一部分由模型生成，但任务仍然由我一步步推动。现在，我更倾向于在任务开始时把目标、边界和验收方式讲清楚，让 agent 自己搜索方案、完成实现，并根据实际结果反复修正。最后我检查 evidence，判断结果能否交付。这个变化表面上是 workflow 的变化，背后反映的是一个更重要的判断：当 AI 开始成为真正的执行主体，人的角色和整个工作系统都需要重新设计。

## AI 成为默认执行者

AI 带来的变化远远超过某一次回答更聪明。它可以持续工作，可以并行处理多个任务，也可以在合适的系统里读取超过单个人带宽的信息。同一套 workflow 还会随着底座模型进步而继续获得能力提升。这意味着我们第一次拥有了一种可以长期参与工作的非人类执行主体，但模型能力不会自动变成稳定产出。如果我们只是和模型聊天，它所能看到的世界通常只有当前 prompt；会议里形成的决定、codebase 过去的 trade-off、当前环境的限制，以及结果到底好不好，只要模型无法 access，对它来说就等于不存在。

因此，一个 AI-centered system 至少需要同时解决三件事：模型能否获得完成任务所需的 context，能否调用工具采取行动，以及能否看到行动后的结果。人仍然负责目标、quality bar、关键判断和最终责任，中间的搜索、实现、测试与修正则可以逐渐交给 agents。这样的分工也改变了我对个人角色的理解。我需要管理的对象开始从代码和单个 task，扩展到问题、agents，以及多个长期存在的工作线程。

## Evaluation 是 Agent 独立工作的起点

真正改变我工作方式的，是让模型自己验证结果。过去做强化学习研究时，我接触过一个经典任务叫 CartPole：智能体控制一辆左右移动的小车，目标是让车上的杆尽量长时间保持直立。经典环境给出的反馈非常简单，只要杆还没有倒，每一个 timestep 就得到 1 分。最近我重新尝试这个任务时，直接把环境和 reward 交给 Codex。模型会自己写控制程序、运行实验，再根据分数修改方法。只要 evaluation 足够清楚，它就可以构建一套程序化的 optimization loop，并通过结果不断逼近目标。这个个人实验不能替代严谨 benchmark，但它说明了一件很实用的事：当成功标准能被机器读取，今天的 coding agent 已经有能力自己寻找实现路径。

![CartPole agent 通过左右移动小车让杆保持直立](/media/notes/gymnasium-cart-pole.gif)

*CartPole-v1：agent 通过左右推动小车，让杆尽量保持直立。图片来源：[Gymnasium 官方文档](https://gymnasium.farama.org/environments/classic_control/cart_pole/)。*

Behavior cloning 中的 compounding error 可以帮助我们理解 evaluation 为什么重要。纯 BC 从 expert trajectories 学习每个 state 下应该采取的 action，但真正 rollout 时，前面一个很小的偏差就可能改变后续 state distribution，让 policy 进入训练数据没有覆盖的区域，随后误差不断累积。[DAgger 论文](https://proceedings.mlr.press/v15/ross11a.html)讨论的正是这个问题。Agent 执行长任务时也会发生类似情况：它可能在一开始误解一个需求，之后的判断又都建立在这个误解上，整条 reasoning 依然显得 coherent，最终结果却已经偏离目标。Prompt、规则和示例提供行为先验，evaluation 则让 agent 在自己的 rollout 中看到真实结果，并在走偏后获得修正机会。

所以我现在面对一个任务，首先会问什么叫完成，哪些条件可以程序化检查，模型能否直接操作最终产品，以及我需要看到什么 evidence 才愿意接受结果。Evaluation 也有不同层次。Tests、type check 和 CI 可以守住确定性的底线；Playwright 或真实 app 操作可以验证用户路径；截图、视频和 logs 让结果对人和其他 reviewer 可见；没有 implementation context 的 reviewer 可以检查开放质量、UX 和实现盲点。不同 verifier 共同构成反馈环境，agent 才可能从“生成一次答案”变成“围绕结果持续优化”。

## Harness 把模型能力变成稳定产出

我的 workflow 也是沿着这个方向逐步演进的。最初是交互式协作，agent 写一点，我检查一点。之后我开始使用自然语言 goal，让模型围绕目标持续工作，但“页面看起来足够好”或“交互符合预期”仍然有很大解释空间。再往后，我让 agent 直接操作最终产品：前端任务通过 Playwright 启动浏览器并走完整用户路径，程序化检查确认功能，截图帮助模型理解视觉状态，录像留给人做最后 review；TUI 则可以进入 terminal emulator，通过 `Xvfb` 在虚拟显示环境中完成真实按键操作。甚至是一些 evaluation set 让模型直接去优化承载“自己”的 harness 本身。交付物由此从一份代码 diff，扩展为实现、测试结果、操作路径和可直接检查的 artifact。

程序化检查覆盖不了全部质量问题，因此我还会启动不继承实现对话的 reviewer，让它独立运行测试、操作产品并检查代码。Reviewer 找到问题后，implementation agent 需要判断反馈是否成立，完成 rebuttal 和 revision，再重新运行 evaluation。另一个 agent 可以用第一次接触产品的视角检查 UX，maintenance agent 则在任务结束后更新文档、changelog 和 repo context。整个过程形成下面的闭环：

![Agent workflow 从 task contract 和 context 出发，经过实现、evaluation、独立 review、human approval，最后将经验写回 context](/media/notes/context-not-control-loop.svg)

*Evaluation 把没有达到 quality bar 的结果送回 revision loop，让 agent 能够持续迭代，而不是在第一次生成后结束任务。*

我所说的 harness engineering，就是把 task contract、environment、context、tools、evaluation、retry、review 和 write-back 组织成一套能持续运行的系统。Prompt 仍然重要，但它只是其中一个入口。真正决定 agent 能否长时间独立工作的，是它有没有足够完整的世界，以及行动以后能不能观察结果。

## Context 决定模型能看见多大的世界

这里的 context 远远超过 prompt 中的几段说明。会议记录、讨论结果、历史 architecture decisions 和当前 repo constraints 都属于 context；codebase、task state、tools、permissions 和 runtime 构成执行环境；tests、logs、真实 UI、UX 和 evaluation results 则提供行动后的反馈。所有只存在于人脑中、模型无法 access 的信息，对模型来说都等于不存在。很多看似是模型能力的问题，实际来自它所处的环境缺少必要信息。

传统 prompt engineering 很大程度上依赖人预先选择信息，再把我们认为有用的内容塞进 context window。这个方法要求人具备接近 oracle 的先验，很难保证其中的内容始终相关。更合理的长期形态是一套 model-driven retrieval system：信息保存在可寻址的 memory 中，并带有时间、owner、source、scope 和 status 等 metadata；模型先理解当前任务，再主动检索需要的 records。Metadata 帮助它判断信息是否仍然有效、适用于哪里，以及冲突时应该相信哪一个来源。Context 因此从一次性 prompt 的组成部分，变成可以被 agents 按需访问的工作基础设施。

新的经验也需要写回系统，而且这个过程应该尽量成为工作的被动副产品。会议可以默认录音和转录，再由模型提取 conclusions 与 decisions；代码任务可以通过 `AGENTS.md` 约束 agent 在完成后更新 ADR、repo constraints 和相关文档。模型整理出的信息需要保留到 raw facts 的 citation，让后续 agent 使用这些结论时仍然可以追溯来源。人不必逐条维护所有文档，但需要定义 capture、review 和 retention 的规则，并在必要时能够审计。

在单个 repo 中，progressive disclosure 是很实用的原则。根目录的 `AGENTS.md` 或 `CLAUDE.md` 只保留稳定约束和 context map，更详细的 architecture decisions、workflows 和 skills 放在独立文件里，agent 遇到相关任务时再按需读取。任务结束后，maintenance agent 把新的 decision 和经验写回正确位置，同时清理失效或重复的信息。这样可以控制 context noise，也让项目经验跨 thread 积累。

## Execution 越便宜，人的选择越重要

AI 会让团队产生更多 ideas，也会显著降低 prototyping 和 implementation 的成本，但竞争对手同样拥有这些能力。做得更快、实现更多 features，很难自然形成长期优势。人的杠杆会越来越集中在决定做什么：通过客户访谈理解真实需求，判断哪些问题值得解决，定义什么样的结果才算好，并决定哪些 feature 最终应该进入产品。

执行变容易以后，团队很容易持续做加法，产品也更容易失去重点。此时做减法变得更加重要。即使某个功能已经可以低成本实现，团队仍然需要判断它是否值得存在，会不会增加认知负担，是否符合产品长期形成的 taste。人的工作因此向 workflow 两端移动：前面负责理解客户、选择问题和设定 quality bar，后面负责检查 evidence、判断结果并承担最终责任。中间的大量搜索、实现、测试和迭代，可以由 agents 自己完成。

<mark>Execution 越便宜，人的价值越集中在问题选择、质量判断和有意识的取舍。</mark>

## 人需要开始管理 Workforce

这种角色变化也会重塑产品界面。过去的工程工具大多围绕 issue、ticket 和单个 task 设计，因为人需要亲自拆解并推动每一步。AI 成为默认 executor 以后，一个人面对的往往是多个同时存在、生命周期可能持续数天的 agent threads。每个 thread 都有自己的目标、context、执行状态和待判断事项。Human interface 因此需要帮助人管理一组持续工作的 workforce，让我们关注 ideas、goals、关键 decisions 和最终 evidence，单个 task 的推进则逐渐留在 agent 的执行层。

公司和个人管理的是同一个闭环中的不同层次。公司层面关注 shared knowledge、ideas、company goals 和最终 results，确保所有人使用一致的事实、quality bar 和安全边界。个人围绕大的 goal 拆出 sub-goals，再组织 agents 完成信息检索、方案探索、任务执行和结果验收。任务完成以后，results 回到公司层面，参与 product decision，并写回 shared knowledge。Reviewer 或 auditor 则需要能够从 result 沿着 evidence 回到原始 execution trace，理解一次交付怎样形成。

默认界面应该展示 goal、当前状态、需要人判断的事项、results 和 evidence。Commands、intermediate steps、reasoning traces 和完整 logs 仍然要保留，但不需要持续占用人的 attention，只有在审计、debug 或争议发生时再展开。结果优先的界面依然保存完整过程，只是把它从默认阅读对象变成按需调用的 evidence。Agent 得到更大的执行空间，人也保留了最终责任和足够的 transparency。

## Terminal 面向 Agent，App 面向 Human

CLI 和 App 在这套系统里承担不同角色。Terminal 是一种高度结构化、可组合的 action interface，模型可以通过命令读取环境、调用工具、观察输出并继续行动。随着 frontier labs 持续提升模型的 terminal 能力，[Terminal-Bench](https://www.tbench.ai/news/announcement)已经开始专门评估 agent 完成真实 terminal tasks 的能力。长期来看，CLI 仍然会非常重要，只是它越来越像模型与外部世界交互的接口。

对人来说，真正稀缺的是 attention 和工作记忆。传统 CLI 隐含的工作方式接近“一次打开一个 terminal，处理一个任务”，人需要自己记住各个 session 的状态，并频繁切换窗口。任务复杂以后，一个主 agent 临时调用几个 sub-agents 已经覆盖不了实际工作。我们管理的是多个独立、并行、可以暂停和恢复的 threads。它们可能分别在实现、测试、等待权限、处理 review，或者等待另一个任务完成。人的界面需要保存这些状态，并在 blocker、approval 或 result ready 时把注意力拉回来。

这有点像 Vim 到 VSCode 的变化。底层编辑能力并没有消失，IDE 提供的价值来自项目导航、状态外显、debug、扩展和跨文件工作。Codex App 对我来说更接近 persistent thread runtime 加 multi-agent workspace，GUI 只是它最外面的一层。Thread 成为工作的基本对象，每个 thread 都可以长期保存 context 和状态；App 负责压缩这些状态，让我同时管理多组 agents，又不必持续阅读每一步 execution。

<mark>Terminal 负责让 Agent 采取行动，App 负责帮助 Human 管理状态和 attention。</mark>

## Integration Cost 下降以后，Atomic Primitives 重新变得重要

这套工作方式还会改变我们选择软件和基础设施的逻辑。过去 all-in-one platform 很有价值，因为 integration cost 很高。接一个 GitHub webhook、配置 CI、管理 Docker、处理权限、连接通知和部署流程，都需要工程师写大量 glue code 并长期维护。平台把这些工作提前做好，团队即使接受一些能力限制，整体上仍然更高效。减少组件数量，也常常意味着减少人类需要协调的边界。

Agent 正在快速降低这部分成本。今天很多 adapter、configuration 和 glue work 已经可以由模型生成和维护。需求变化时，agent 可以修改 workflow；工具升级时，它也可以更新调用方式。过去需要人工投入几天的连接工作，现在可能缩短到一次 agent task。Build 和 buy 的边界随之变化：平台预先集成所带来的便利仍然存在，但为了这种便利长期接受封闭的数据模型、固定的 workflow 和有限的可配置空间，代价开始变得更明显。

当连接成本下降，我们可以重新选择每一层最合适的 primitive：Git 提供版本管理，VM 或 Daytona 提供隔离环境，browser 提供真实 UI，storage 保存 artifacts，queue 处理任务，Slack 负责通知，模型负责理解和推理。Agent 在运行时把这些能力组合成完成当前任务所需的 workflow。每一个 primitive 都可以独立升级，模型能力也会持续提升，整个系统因此获得一种 compounding advantage。我们不必等待某一个 all-in-one vendor 同时把所有层都做到足够好。

采用原子化能力时，我们依然会复用成熟基础设施。Git、CI、storage、browser、VM 和 sandbox 都没有必要重新实现。真正值得自己掌握的是 workflow layer：task state 怎样保存，agents 怎样被调度，context 怎样进入任务，evaluation 怎样运行，哪些动作需要 approval，以及结果怎样写回。稳定能力适合做成可靠、权限清晰的 primitives；具体 workflow 则可以由 agent 根据任务动态组合。

Configuration 在这里的角色也会变化。过去 Dockerfile、CI YAML、Terraform 和各种 adapter code 往往代表一支团队长期积累的集成知识，修改它们需要专门的人理解全部细节。Agent 可以生成、读取和持续维护这些文件以后，很多 configuration 会更接近可再生的 implementation layer。真正需要长期保存的是背后的 intent、policy、interface contract 和 evaluation；配置坏了或需求变化时，agent 可以根据这些稳定约束重新生成或修复具体实现。

平台仍然有重要价值，尤其在权限、安全、审计、可靠性和团队共享方面。变化发生在价值重心上。过去平台的优势经常来自“已经替你接好了”，未来更重要的问题会变成：它提供的 capability 是否足够原子、稳定、快速，API 和权限模型是否清楚，以及它能否被不同 agents 自由调用。软件系统的优化目标也会从单纯减少组件数量，逐渐转向减少组件之间需要由人承担的协调成本。

## 为什么我不把 Agent Workflow 绑在 GitHub 上

GitHub 仍然是这套系统里的重要组成部分。它很适合继续承载 source control、issue、PR、review、checks 和 audit record。我的保留意见主要针对另一种做法：把从 issue 触发、agent 实现、测试、修改到最终提交 PR 的完整生命周期，都放进 GitHub-specific 的 cloud agent workflow。GitHub 可以作为任务入口、公司级协作层和 system of record，但没有必要同时成为 agent 的大脑、长期状态和唯一执行环境。

第一个原因来自执行环境本身。我的本地或常驻 system 已经拥有完整依赖、build cache、repo context、工具配置和登录状态。代码偏好、architecture constraints 和验收规则也已经保存在 `AGENTS.md`、ADR 或相关 skills 中。Agent 进入 repo 后可以直接工作。Cloud task 往往需要重新构造这个世界，安装依赖、配置权限、恢复 context，再理解怎样运行和验收项目。即使 Docker image 已经准备好，冷启动和环境重建仍然存在。对于 native desktop app，这个差异更加明显；一台 Mac 可以直接 build、操作并录制真实应用，Linux headless environment 很难自然覆盖同样的验证路径。

第二个原因是我希望透明地管理 agents。Agent 承担完整任务以后，我更愿意把它看成一个长期工作的执行者。我需要知道哪些 threads 正在运行、哪里卡住、当前 evidence 是什么，也希望能在必要时调整方向或补充 context。一个封装在 cloud task 里的执行过程通常只在结束时返回结果，中途介入和跨任务状态管理都比较困难。Codex App 的 persistent threads 更符合这种 manager workflow：执行细节可以默认隐藏，任务状态和关键节点必须保持可见。

第三个原因是公司 context 和个人 execution 可以分层。公司应该统一维护 `AGENTS.md`、architecture decisions、安全策略、CI/CD、evaluation contract 和 audit requirements，让任何人使用任何 agent 都必须满足同一套质量标准。至于个人使用 Codex、Claude Code 或其他 agent，怎样组织 threads，以及选择 local 还是 cloud execution，可以保留一定自由。公司需要统一的是交付质量、可审计性和必要的 context，个人执行工具没有必要被锁成唯一方案。

第四个原因是 portability 和 vendor lock-in。我们今天使用 GitHub，未来可能切换到其他 Git service，甚至建设自己的 Git infrastructure。如果 task state、agent memory、orchestration 和 eval contract 全部建立在 GitHub-specific feature 上，迁移就意味着重做整套 agent operating system。把 GitHub 设计成 replaceable adapter 后，issue、PR 和 review 仍然可以继续工作，底层 Git provider 发生变化也不会破坏核心 loop。同样的 adapter 思路也适用于 Linear、Slack 或其他任务入口。

## Local Orchestrator 与 Cloud Evaluation

Cloud 在这套架构中依然不可替代。它适合提供 clean environment、隔离执行、弹性并发和可复现 evaluation。本地或常驻节点更适合保存长期状态、调度 threads、管理 credentials、复用 cache，并为人提供持续可见的操作界面。这两个层次可以分别看作 control plane 和 execution plane：常驻 orchestrator 理解任务和历史，disposable sandbox 负责在干净环境中验证结果。

![Persistent orchestrator 将任务分发到本地持久环境和 disposable cloud sandboxes，再经过 evaluation、approval、交付与 context write-back](/media/notes/context-not-control-orchestrator.svg)

*Persistent orchestrator 保存任务状态与 context，disposable cloud environment 提供干净、可复现的 evaluation。*

在我当前设想的具体 workflow 中，常驻主线程可以监听 GitHub 或其他任务系统里的 issue 和 PR event，再为不同任务创建独立 threads 和 worktrees。Agents 在本地或持久环境中完成主要实现，需要隔离验证时才把结果送到远端 sandbox。Sandbox 运行 clean tests、真实 UI 操作和录像，产出 metrics 与 artifacts；policy 和 human review 通过以后，结果再回到 GitHub 形成 PR、comment 或 merge。GitHub 记录公司协作与交付结果，agent runtime 保存更完整的工作状态。

这样的分工还能复用基础设施。代码需要 clean environment 做隔离测试、真实 UI 验收和 artifact capture；未来 model team 也会需要相似的能力来运行 model evaluation，收集 metrics、traces 和结果。与其为 GitHub agent workflow 学习并维护一套封闭执行机制，我们可以把已有的 evaluation substrate 建成通用能力，同时服务代码和模型。GitHub、Daytona 或其他工具继续提供成熟 primitives，公司掌握 orchestration、长期状态、context 和 evaluation。

Mac mini 只是我当前使用的一个具体实现。长期 orchestrator 可以是一台服务器、一个 daemon，甚至一个更完整的 control service。真正稳定的判断是：agent 是长期存在、会积累状态的 actor，cloud sandbox 是它按需调用的 execution substrate。只要这层边界保持清楚，个人工作方式、Git provider 和具体 cloud runtime 都可以继续演进。

## 从一个 Repo 开始

这套工作方式不需要等到 company-wide context layer 建成以后才能开始。最实际的起点，是挑选一个自己正在维护的 repo 和一个真实任务。首先写清楚 evaluation：除了 tests，agent 能否看到最终 UI、UX 或其他真实结果，人最后要检查什么 evidence。然后整理 context：`AGENTS.md` 或 `CLAUDE.md` 是否说明了稳定约束，重要 decision 是否进入 ADR，详细 workflow 能否被按需发现。接下来让 agent 独立完成执行、测试、真实 interface 操作和 reviewer loop，并在任务结束后把新经验写回项目。

当一个 repo 中的 loop 可以稳定运行，一个人就可以开始同时管理多个 threads。经过验证的 eval、context 和 tools 再逐渐扩展到团队，最后形成公司可以复用的基础设施。这个顺序很重要，因为 AI-native 并不需要从宏大的组织设计开始。它可以从一个任务开始：先定义结果，再准备 context，让 agents 完成执行，并用 evidence 证明结果。

面对越来越强的模型，工具用法只是最外面的一层。我们还需要学习怎样像 manager 一样定义问题，怎样给 agents 建立可以闭环的环境，以及怎样把个人经验沉淀成下一次工作可以直接利用的 context。对 Funda 来说，我们既要打造产品，也要逐渐形成一套用 agents 持续打造产品的工作方式。
