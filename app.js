/**
 * InstaCheck Pro - Core Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // === 埋め込み用API連携設定 (全デバイス共有用) ===
    // 複数デバイスで設定を共有するために、サイト自体に認証情報を埋め込む場合は以下を設定してください。
    // (※注意: GitHubなどのパブリックリポジトリにアップロードすると、第三者に認証情報が見える状態になります。共有時はプライベートリポジトリをご利用ください)
    const EMBEDDED_CONFIG = {
        igAccountId: '17841417751256431',     // ここに Instagram Business Account ID を設定 (例: '17841400000000000')
        igAccessToken: 'EAATOXqb0ebIBR9gyiwZCBcFaEmhPhiW7uQfkwoUAaWitZC7UzGRAHl71PCc1yyZCbh4P2tOzIRcfSfj0CUXMmwCD8MFoIVVBIbIBoZC9kZBX8yIlrNcEkHD3gcZByk6vQVqZAEqvPYpGuqW94zy8zUME3ZBZCwkavN0V7FZAAHm5Ge3bw3ZBjyGi3vJcjYEDWcv',   // ここに アクセストークン を設定 (例: 'EAABsb...')
        isDemoMode: false,     // 実際に稼働させる場合は false に設定
        // --- Supabase 接続設定 (複数デバイスリアルタイム同期用) ---
        supabaseUrl: 'https://ixhyjgxshbgmbdfqacfg.supabase.co',
        supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4aHlqZ3hzaGJnbWJkZnFhY2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMTgyMzYsImV4cCI6MjA5ODc5NDIzNn0.rapV1AmpNZ8Klr90QM5EJnA_3IgeINCv3rO9ywFzVaA'
    };

    // Supabase クライアントの初期化
    let supabaseClient = null;
    if (typeof supabase !== 'undefined' && EMBEDDED_CONFIG.supabaseUrl && EMBEDDED_CONFIG.supabaseKey) {
        try {
            supabaseClient = supabase.createClient(EMBEDDED_CONFIG.supabaseUrl, EMBEDDED_CONFIG.supabaseKey);
        } catch (err) {
            console.error('Supabase initialization failed:', err);
        }
    }

    // 状態管理
    let posts = [];
    let tagSets = [];
    let currentFilter = 'all';
    let currentRole = 'creator'; // 'creator' or 'reviewer'
    let activePostId = null;
    let selectedImages = []; // Array of Base64 or URLs
    let currentPreviewImgIndex = 0;

    const initialTagSets = [
        { id: 'tag-1', name: '✨ ブランド共通', tags: '#official_brand #新作 #トレンド2026 #おすすめ' },
        { id: 'tag-2', name: '☕ カフェ・グルメ', tags: '#カフェスタグラム #東京カフェ #カフェ巡り #スイーツ部' },
        { id: 'tag-3', name: '🎁 プレゼント企画', tags: '#プレゼントキャンペーン #懸賞 #フォローいいね #感謝還元' }
    ];

    // DOM要素の取得
    const postsGrid = document.getElementById('postsGrid');
    const emptyState = document.getElementById('emptyState');
    const roleSelector = document.getElementById('roleSelector');
    const searchInput = document.getElementById('searchInput');
    const searchOptions = document.getElementById('searchOptions');
    const pageTitle = document.getElementById('pageTitle');
    const navItems = document.querySelectorAll('.nav-item');

    // ビュー切り替えDOM
    const postsView = document.getElementById('postsView');
    const analyticsView = document.getElementById('analyticsView');

    // KPI & 分析DOM
    const kpiTotalReach = document.getElementById('kpiTotalReach');
    const kpiTotalSaved = document.getElementById('kpiTotalSaved');
    const kpiAvgEngRate = document.getElementById('kpiAvgEngRate');
    const kpiPublishedCount = document.getElementById('kpiPublishedCount');
    const topSavedList = document.getElementById('topSavedList');

    // モーダル分析DOM
    const insightsSection = document.getElementById('insightsSection');
    const valReach = document.getElementById('valReach');
    const valImpressions = document.getElementById('valImpressions');
    const valSaved = document.getElementById('valSaved');
    const valLikes = document.getElementById('valLikes');

    // モーダル関連DOM
    const postModal = document.getElementById('postModal');
    const apiModal = document.getElementById('apiModal');
    const tagModal = document.getElementById('tagModal');
    const lightboxModal = document.getElementById('lightboxModal');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const btnCloseLightbox = document.getElementById('btnCloseLightbox');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');

    const btnNewPost = document.getElementById('btnNewPost');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnApiSettings = document.getElementById('btnApiSettings');
    const btnCloseApiModal = document.getElementById('btnCloseApiModal');
    const btnSaveApiSettings = document.getElementById('btnSaveApiSettings');
    const btnTagSettings = document.getElementById('btnTagSettings');
    const btnCloseTagModal = document.getElementById('btnCloseTagModal');
    const btnAddTagSet = document.getElementById('btnAddTagSet');
    const newTagNameInput = document.getElementById('newTagName');
    const newTagContentInput = document.getElementById('newTagContent');
    const registeredTagSetsList = document.getElementById('registeredTagSetsList');
    const quickTagList = document.getElementById('quickTagList');

    const initialSamplePosts = [
        {
            id: 'post-1',
            title: '7月限定 新商品プロモーション',
            caption: '🌟 夏の新作コレクションが登場！\n涼しげな素材感とトレンドカラーをミックスした限定アイテムを展開中✨\n\n店頭およびオンラインショップでご購入いただけます。\nプロフィールのリンクからチェック！🔗\n\n#夏コーデ #新作アイテム #ファッション #トレンド #限定コスメ #summer2026',
            images: [
                'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80'
            ],
            status: 'published', // サンプル用に投稿完了へ
            scheduledDate: '2026-07-01T10:00',
            createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
            comments: [
                { id: 'c-1', author: '担当：田中', role: 'creator', text: '新商品のカルーセル画像2枚を作成しました。ご確認よろしくお願いします！', time: '4時間前' }
            ],
            insights: { reach: 18450, impressions: 24300, saved: 820, likes: 1420 }
        },
        {
            id: 'post-2',
            title: 'ブランド設立5周年記念プレゼントキャンペーン',
            caption: '🎁【豪華プレゼント】感謝を込めてキャンペーンを開催！\nいつも応援ありがとうございます。抽選で10名様に特別ギフトボックスをプレゼント🎁\n\n【応募方法】\n1. このアカウント (@official_brand_demo) をフォロー\n2. この投稿に「いいね！」\n\n#プレゼント企画 #キャンペーン #懸賞 #5周年 #感謝還元',
            images: [
                'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=600&auto=format&fit=crop&q=80'
            ],
            status: 'published',
            scheduledDate: '2026-07-05T18:00',
            createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
            comments: [
                { id: 'c-2', author: '承認者：佐藤部長', role: 'reviewer', text: '応募期間の記載が抜けているようです。キャプションに「応募締め切り：7/15 23:59まで」を追記してください！', time: '1日前' }
            ],
            insights: { reach: 32100, impressions: 41200, saved: 1540, likes: 3890 }
        },
        {
            id: 'post-3',
            title: 'カフェ新メニュー「抹茶ラテ」紹介',
            caption: '🍵 濃厚な京都宇治抹茶を使用した贅沢抹茶ラテが本日よりスタート！\nほっと一息つきたい午後にぴったりの味わいです。ほろ苦さとミルクの甘みの絶妙なハーモニーをお楽しみください☕️\n\n#カフェスタグラム #抹茶ラテ #抹茶スイーツ #東京カフェ #カフェ巡り',
            images: [
                'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80'
            ],
            status: 'approved',
            scheduledDate: '',
            createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
            comments: [
                { id: 'c-3', author: '承認者：佐藤部長', role: 'reviewer', text: '写真もきれいで文章もバッチリです。承認しました！', time: '2日前' }
            ],
            insights: { reach: 9800, impressions: 12100, saved: 410, likes: 890 }
        }
    ];

    // フォーム関連DOM
    const postForm = document.getElementById('postForm');
    const modalTitle = document.getElementById('modalTitle');
    const postIdInput = document.getElementById('postId');
    const postTitleInput = document.getElementById('postTitle');
    const postImagesInput = document.getElementById('postImages');
    const postCaptionInput = document.getElementById('postCaption');
    const scheduledDateInput = document.getElementById('scheduledDate');
    const charCounter = document.getElementById('charCounter');
    const imageThumbnails = document.getElementById('imageThumbnails');
    const dropzone = document.getElementById('dropzone');
    const commentsList = document.getElementById('commentsList');
    const newCommentInput = document.getElementById('newCommentInput');

    // プレビューDOM
    const igPreviewCaption = document.getElementById('igPreviewCaption');
    const igMediaWrapper = document.getElementById('igMediaWrapper');

    // アクションボタンDOM
    const btnDeletePost = document.getElementById('btnDeletePost');
    const creatorActionButtons = document.getElementById('creatorActionButtons');
    const reviewerActionButtons = document.getElementById('reviewerActionButtons');
    const btnSaveDraft = document.getElementById('btnSaveDraft');
    const btnSubmitApproval = document.getElementById('btnSubmitApproval');
    const btnRequestChanges = document.getElementById('btnRequestChanges');
    const btnApprove = document.getElementById('btnApprove');
    const btnPublishNow = document.getElementById('btnPublishNow');

    // アプリ初期化
    initApp();

    async function initApp() {
        await loadPosts();
        loadTagSets();
        loadApiSettings();
        setupEventListeners();
        setupSupabaseRealtime();
        render();
    }

    async function loadPosts() {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('instacheck_posts')
                    .select('*');

                if (error) throw error;
                if (data && data.length > 0) {
                    // 作成日時降順に並び替え
                    posts = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                } else {
                    // もしデータベースが空なら初期サンプルを挿入
                    posts = [...initialSamplePosts];
                    for (const post of posts) {
                        await savePostToSupabase(post);
                    }
                }
            } catch (err) {
                console.error('Supabase load error:', err);
                loadPostsFromLocalStorage();
            }
        } else {
            loadPostsFromLocalStorage();
        }
    }

    function loadPostsFromLocalStorage() {
        const stored = localStorage.getItem('instacheck_posts');
        if (stored) {
            try {
                posts = JSON.parse(stored);
            } catch (e) {
                posts = initialSamplePosts;
            }
        } else {
            posts = initialSamplePosts;
            savePostsLocalStorage();
        }
    }

    async function savePostToSupabase(post) {
        if (supabaseClient) {
            try {
                const { error } = await supabaseClient
                    .from('instacheck_posts')
                    .upsert(post);
                if (error) throw error;
            } catch (err) {
                console.error('Supabase save error:', err);
            }
        }
    }

    async function deletePostFromSupabase(postId) {
        if (supabaseClient) {
            try {
                const { error } = await supabaseClient
                    .from('instacheck_posts')
                    .delete()
                    .eq('id', postId);
                if (error) throw error;
            } catch (err) {
                console.error('Supabase delete error:', err);
            }
        }
    }

    function setupSupabaseRealtime() {
        if (supabaseClient) {
            supabaseClient
                .channel('schema-db-changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'instacheck_posts' },
                    async () => {
                        // データ変更時に再読み込みして描画
                        await loadPosts();
                        render();
                    }
                )
                .subscribe();
        }
    }

    function loadTagSets() {
        const stored = localStorage.getItem('instacheck_tagsets');
        if (stored) {
            try {
                tagSets = JSON.parse(stored);
            } catch (e) {
                tagSets = initialTagSets;
            }
        } else {
            tagSets = initialTagSets;
            saveTagSets();
        }
        renderTagSets();
    }

    function saveTagSets() {
        try {
            localStorage.setItem('instacheck_tagsets', JSON.stringify(tagSets));
        } catch (e) {
            console.warn('LocalStorage tagsets error', e);
        }
    }

    function loadApiSettings() {
        let storedId = localStorage.getItem('instacheck_ig_account_id');
        let storedToken = localStorage.getItem('instacheck_ig_access_token');

        // デモ用デフォルト値、空文字、null/undefined文字列の場合は無視して埋め込み設定を優先する
        if (!storedId || storedId.trim() === '' || storedId === 'null' || storedId === 'undefined' || storedId === '17841400000000000 (デモ)' || storedId === '17841400000000000') {
            storedId = null;
        }
        if (!storedToken || storedToken.trim() === '' || storedToken === 'null' || storedToken === 'undefined' || storedToken === 'dummy_access_token_demo_12345') {
            storedToken = null;
        }

        const igAccountId = storedId || EMBEDDED_CONFIG.igAccountId || '17841400000000000 (デモ)';
        const igAccessToken = storedToken || EMBEDDED_CONFIG.igAccessToken || 'dummy_access_token_demo_12345';
        
        let isDemoMode = EMBEDDED_CONFIG.isDemoMode;
        if (localStorage.getItem('instacheck_demo_mode') !== null) {
            isDemoMode = localStorage.getItem('instacheck_demo_mode') !== 'false';
        }

        const igAccountIdInput = document.getElementById('igAccountId');
        const igAccessTokenInput = document.getElementById('igAccessToken');
        const chkDemoMode = document.getElementById('chkDemoMode');

        if (igAccountIdInput) igAccountIdInput.value = igAccountId;
        if (igAccessTokenInput) igAccessTokenInput.value = igAccessToken;
        if (chkDemoMode) chkDemoMode.checked = isDemoMode;
    }

    function updateCounts() {
        const countAll = document.getElementById('countAll');
        const countPending = document.getElementById('countPending');
        const countChanges = document.getElementById('countChanges');
        const countApproved = document.getElementById('countApproved');
        const countPublished = document.getElementById('countPublished');
        const countDraft = document.getElementById('countDraft');

        if (countAll) countAll.textContent = posts.length;
        if (countPending) countPending.textContent = posts.filter(p => p.status === 'pending').length;
        if (countChanges) countChanges.textContent = posts.filter(p => p.status === 'changes_requested').length;
        if (countApproved) countApproved.textContent = posts.filter(p => p.status === 'approved').length;
        if (countPublished) countPublished.textContent = posts.filter(p => p.status === 'published').length;
        if (countDraft) countDraft.textContent = posts.filter(p => p.status === 'draft').length;
    }

    function dataURLtoBlob(dataurl) {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    async function uploadToTemporaryHost(base64Data) {
        const blob = dataURLtoBlob(base64Data);
        const formData = new FormData();
        formData.append('file', blob, `image_${Date.now()}.jpg`);

        const response = await fetch('https://tmpfiles.org/api/v1/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('画像アップロードサーバーへの通信に失敗しました。');
        }

        const resJson = await response.json();
        if (resJson.status !== 'success' || !resJson.data || !resJson.data.url) {
            throw new Error('画像サーバーの応答が不正です。');
        }

        // 表示用URLをダイレクトダウンロード用のURL(dl/)に変換
        return resJson.data.url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
    }

    function renderTagSets() {
        // 1. 投稿編集フォーム上のチップ一覧
        quickTagList.innerHTML = '';
        if (tagSets.length === 0) {
            quickTagList.innerHTML = `<span style="font-size:0.7rem; color:var(--text-muted);">登録タグなし</span>`;
        } else {
            tagSets.forEach(set => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'tag-chip';
                chip.textContent = set.name;
                chip.title = set.tags;
                chip.onclick = () => insertTagSet(set.tags);
                quickTagList.appendChild(chip);
            });
        }

        // 2. タグ管理モーダル内のリスト表示
        registeredTagSetsList.innerHTML = '';
        if (tagSets.length === 0) {
            registeredTagSetsList.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted); text-align:center;">タグセットがありません</p>`;
        } else {
            tagSets.forEach((set, index) => {
                const item = document.createElement('div');
                item.className = 'tag-set-item';
                item.innerHTML = `
                    <div class="tag-set-meta">
                        <h5>${escapeHtml(set.name)}</h5>
                        <p>${escapeHtml(set.tags)}</p>
                    </div>
                    <button type="button" class="btn-delete-tag" title="削除">&times;</button>
                `;
                item.querySelector('.btn-delete-tag').onclick = () => {
                    tagSets.splice(index, 1);
                    saveTagSets();
                    renderTagSets();
                };
                registeredTagSetsList.appendChild(item);
            });
        }
    }

    function insertTagSet(tagsToInsert) {
        const currentCaption = postCaptionInput.value;
        if (currentCaption.trim() === '') {
            postCaptionInput.value = tagsToInsert;
        } else {
            postCaptionInput.value = currentCaption + '\n\n' + tagsToInsert;
        }
        updateLivePreview();
    }

    function savePostsLocalStorage() {
        try {
            localStorage.setItem('instacheck_posts', JSON.stringify(posts));
        } catch (e) {
            console.warn('LocalStorage error (quota exceeded): storing in memory session only', e);
        }
    }

    async function savePosts(updatedPost) {
        savePostsLocalStorage();

        if (supabaseClient && updatedPost) {
            await savePostToSupabase(updatedPost);
        }
    }

    function setupEventListeners() {
        // 視点切替
        roleSelector.addEventListener('change', (e) => {
            currentRole = e.target.value;
            render();
            if (!postModal.classList.contains('hidden')) {
                updateModalRoleView();
            }
        });

        // フィルター切替
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                currentFilter = item.dataset.filter;
                updatePageTitle();
                render();
            });
        });

        // 検索
        searchInput.addEventListener('input', () => render());

        // モーダル開閉
        btnNewPost.addEventListener('click', () => {
            currentRole = 'creator';
            roleSelector.value = 'creator';
            openEditorModal(null);
        });
        btnCloseModal.addEventListener('click', closeEditorModal);
        if (btnApiSettings) {
            btnApiSettings.addEventListener('click', () => apiModal.classList.remove('hidden'));
        }
        btnCloseApiModal.addEventListener('click', () => apiModal.classList.add('hidden'));
        btnSaveApiSettings.addEventListener('click', () => {
            const igAccountId = document.getElementById('igAccountId').value.trim();
            const igAccessToken = document.getElementById('igAccessToken').value.trim();
            const isDemoMode = document.getElementById('chkDemoMode').checked;

            localStorage.setItem('instacheck_ig_account_id', igAccountId);
            localStorage.setItem('instacheck_ig_access_token', igAccessToken);
            localStorage.setItem('instacheck_demo_mode', isDemoMode);

            alert('API連携設定を保存しました。');
            apiModal.classList.add('hidden');
        });

        // タグセットモーダル開閉＆追加
        btnTagSettings.addEventListener('click', () => tagModal.classList.remove('hidden'));
        btnCloseTagModal.addEventListener('click', () => tagModal.classList.add('hidden'));
        btnAddTagSet.addEventListener('click', () => {
            const name = newTagNameInput.value.trim();
            const tags = newTagContentInput.value.trim();
            if (!name || !tags) {
                alert('セット名とハッシュタグを入力してください。');
                return;
            }
            tagSets.push({
                id: 'tag-' + Date.now(),
                name,
                tags
            });
            saveTagSets();
            renderTagSets();
            newTagNameInput.value = '';
            newTagContentInput.value = '';
            alert('新しいタグセットを登録しました！');
        });

        // モーダル背景クリック閉じる
        postModal.addEventListener('click', (e) => {
            if (e.target === postModal) closeEditorModal();
        });
        apiModal.addEventListener('click', (e) => {
            if (e.target === apiModal) apiModal.classList.add('hidden');
        });
        tagModal.addEventListener('click', (e) => {
            if (e.target === tagModal) tagModal.classList.add('hidden');
        });
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal || e.target === btnCloseLightbox) {
                lightboxModal.classList.add('hidden');
            }
        });
        btnCloseLightbox.addEventListener('click', () => lightboxModal.classList.add('hidden'));

        lightboxPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            if (selectedImages.length > 1) {
                currentPreviewImgIndex = (currentPreviewImgIndex - 1 + selectedImages.length) % selectedImages.length;
                updateLightboxView();
                updateLivePreview();
            }
        });
        lightboxNext.addEventListener('click', (e) => {
            e.stopPropagation();
            if (selectedImages.length > 1) {
                currentPreviewImgIndex = (currentPreviewImgIndex + 1) % selectedImages.length;
                updateLightboxView();
                updateLivePreview();
            }
        });

        // リアルタイムプレビュー更新
        postCaptionInput.addEventListener('input', updateLivePreview);

        // 画像選択ハンドラ
        postImagesInput.addEventListener('change', handleImageUpload);

        // ドラッグ＆ドロップ
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--accent-blue)';
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.style.borderColor = 'var(--border-dark)';
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--border-dark)';
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                processFiles(e.dataTransfer.files);
            }
        });

        // ワークフローアクションボタン
        btnSaveDraft.addEventListener('click', () => savePostWithStatus('draft'));
        btnSubmitApproval.addEventListener('click', () => savePostWithStatus('pending'));
        btnRequestChanges.addEventListener('click', () => handleReviewerAction('changes_requested'));
        btnApprove.addEventListener('click', () => handleReviewerAction('approved'));
        btnPublishNow.addEventListener('click', handlePublishToInstagram);
        btnDeletePost.addEventListener('click', handleDeletePost);
    }

    function updatePageTitle() {
        const titleMap = {
            all: 'すべての投稿',
            pending: '承認待ちの投稿 ⏳',
            changes_requested: '修正依頼中の投稿 ⚠️',
            approved: '承認済みの投稿 (投稿待機) ✅',
            published: '投稿完了アーカイブ 🚀',
            draft: '下書きリスト ✏️',
            analytics: 'パフォーマンス分析ダッシュボード 📊'
        };
        pageTitle.textContent = titleMap[currentFilter] || 'すべての投稿';
    }

    // メイン描画関数
    function render() {
        updateCounts();
        updatePageTitle();

        if (currentFilter === 'analytics') {
            postsView.classList.add('hidden');
            analyticsView.classList.remove('hidden');
            searchOptions.classList.add('hidden');
            renderAnalytics();
            return;
        }

        postsView.classList.remove('hidden');
        analyticsView.classList.add('hidden');
        searchOptions.classList.remove('hidden');

        // フィルタリングと検索
        const query = searchInput.value.toLowerCase().trim();
        const filtered = posts.filter(post => {
            const matchesFilter = currentFilter === 'all' || post.status === currentFilter;
            const matchesSearch = !query || 
                post.title.toLowerCase().includes(query) || 
                post.caption.toLowerCase().includes(query);
            return matchesFilter && matchesSearch;
        });

        postsGrid.innerHTML = '';
        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            filtered.forEach(post => {
                const card = createPostCard(post);
                postsGrid.appendChild(card);
            });
        }
    }

    function renderAnalytics() {
        const publishedPosts = posts.filter(p => p.status === 'published' || p.insights);
        let totalReach = 0;
        let totalSaved = 0;
        let totalEng = 0;

        publishedPosts.forEach(p => {
            if (p.insights) {
                totalReach += (p.insights.reach || 0);
                totalSaved += (p.insights.saved || 0);
                const eng = (p.insights.likes || 0) + (p.insights.saved || 0) + (p.comments ? p.comments.length : 0);
                totalEng += eng;
            }
        });

        const publishedCount = publishedPosts.length;
        const avgEngRate = totalReach > 0 ? ((totalEng / totalReach) * 100).toFixed(1) : '0.0';

        kpiTotalReach.textContent = totalReach.toLocaleString();
        kpiTotalSaved.textContent = totalSaved.toLocaleString();
        kpiAvgEngRate.textContent = `${avgEngRate}%`;
        kpiPublishedCount.textContent = publishedCount;

        // 保存数ランキング Top 3
        const sorted = [...publishedPosts].sort((a, b) => {
            const savedA = a.insights ? a.insights.saved : 0;
            const savedB = b.insights ? b.insights.saved : 0;
            return savedB - savedA;
        }).slice(0, 3);

        topSavedList.innerHTML = '';
        if (sorted.length === 0) {
            topSavedList.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted); padding:1rem 0;">分析データのある公開済み投稿がありません。</p>`;
        } else {
            sorted.forEach((p, idx) => {
                const saved = p.insights ? p.insights.saved : 0;
                const reach = p.insights ? p.insights.reach : 0;
                const saveRate = reach > 0 ? ((saved / reach) * 100).toFixed(1) : '0.0';
                const cover = (p.images && p.images.length > 0) ? p.images[0] : '';

                const item = document.createElement('div');
                item.className = 'ranking-item';
                item.style.cursor = 'pointer';
                item.onclick = () => openEditorModal(p.id);
                item.innerHTML = `
                    <div class="ranking-left">
                        <span class="rank-badge">${idx + 1}</span>
                        <img src="${cover}" class="rank-thumb" alt="thumb">
                        <div class="rank-info">
                            <h4>${escapeHtml(p.title)}</h4>
                            <p>${formatDate(p.createdAt)} 公開</p>
                        </div>
                    </div>
                    <div class="ranking-metrics">
                        <span>📊 リーチ: <strong>${reach.toLocaleString()}</strong></span>
                        <span>💾 保存: <strong style="color:var(--status-pending);">${saved.toLocaleString()}</strong> (${saveRate}%)</span>
                    </div>
                `;
                topSavedList.appendChild(item);
            });
        }
    }

    function createPostCard(post) {
        const card = document.createElement('div');
        card.className = 'post-card';
        card.addEventListener('click', () => openEditorModal(post.id));

        const statusLabels = {
            draft: '下書き',
            pending: '承認待ち',
            changes_requested: '修正依頼',
            approved: '承認済み',
            published: '投稿完了'
        };

        const coverImage = (post.images && post.images.length > 0) 
            ? post.images[0] 
            : 'https://via.placeholder.com/400x300/1e293b/64748b?text=No+Image';

        const isCarousel = post.images && post.images.length > 1;
        const insights = post.insights;

        card.innerHTML = `
            <div class="card-media">
                <img src="${coverImage}" alt="${post.title}" loading="lazy">
                <span class="status-pill ${post.status}">${statusLabels[post.status]}</span>
                ${isCarousel ? `<span class="media-badge-carousel">🖼️ 1/${post.images.length}</span>` : ''}
            </div>
            <div class="card-body">
                <div>
                    <h3 class="card-title">${escapeHtml(post.title)}</h3>
                    <p class="card-snippet">${escapeHtml(post.caption)}</p>
                </div>
                <div>
                    ${insights ? `
                        <div class="card-insights-bar">
                            <span>📊 リーチ: <strong>${insights.reach.toLocaleString()}</strong></span>
                            <span>💾 保存: <strong>${insights.saved.toLocaleString()}</strong></span>
                        </div>
                    ` : ''}
                    <div class="card-meta" style="${insights ? 'border-top:none; padding-top:0.4rem;' : ''}">
                        <span>💬 コメント ${post.comments ? post.comments.length : 0}件</span>
                        <span>${formatDate(post.createdAt)}</span>
                    </div>
                </div>
            </div>
        `;
        return card;
    }

    // モーダル表示とデータセット
    function openEditorModal(postId) {
        activePostId = postId;
        newCommentInput.value = '';
        currentPreviewImgIndex = 0;

        if (postId) {
            const post = posts.find(p => p.id === postId);
            if (!post) return;
            modalTitle.textContent = `投稿の確認・編集 (${getStatusLabel(post.status)})`;
            postIdInput.value = post.id;
            postTitleInput.value = post.title;
            postCaptionInput.value = post.caption;
            scheduledDateInput.value = post.scheduledDate || '';
            selectedImages = [...(post.images || [])];
            btnDeletePost.classList.remove('hidden');
            renderComments(post.comments || []);

            // インサイトデータの描画
            if (post.insights) {
                insightsSection.classList.remove('hidden');
                valReach.textContent = (post.insights.reach || 0).toLocaleString();
                valImpressions.textContent = (post.insights.impressions || 0).toLocaleString();
                valSaved.textContent = (post.insights.saved || 0).toLocaleString();
                valLikes.textContent = (post.insights.likes || 0).toLocaleString();
            } else {
                insightsSection.classList.add('hidden');
            }
        } else {
            modalTitle.textContent = '新規投稿の作成';
            postIdInput.value = '';
            postTitleInput.value = '';
            postCaptionInput.value = '';
            scheduledDateInput.value = '';
            selectedImages = [];
            btnDeletePost.classList.add('hidden');
            insightsSection.classList.add('hidden');
            renderComments([]);
        }

        renderThumbnails();
        updateLivePreview();
        updateModalRoleView();
        postModal.classList.remove('hidden');
    }

    function closeEditorModal() {
        postModal.classList.add('hidden');
        activePostId = null;
    }

    function updateModalRoleView() {
        const post = activePostId ? posts.find(p => p.id === activePostId) : null;
        const status = post ? post.status : 'draft';

        // 役割によるボタン表示
        if (currentRole === 'creator') {
            creatorActionButtons.classList.remove('hidden');
            reviewerActionButtons.classList.add('hidden');
            
            // 投稿済みまたは承認済みの場合は作成者編集制限
            const isReadonly = status === 'published';
            toggleFormReadonly(isReadonly);
        } else {
            // 承認者視点
            creatorActionButtons.classList.add('hidden');
            reviewerActionButtons.classList.remove('hidden');
            toggleFormReadonly(false);

            // 「Instagramへ今すぐ投稿」ボタンは承認済みステータスの時だけ目立たせる
            if (status === 'approved') {
                btnPublishNow.classList.remove('hidden');
            } else {
                btnPublishNow.classList.add('hidden');
            }
        }
    }

    function toggleFormReadonly(readonly) {
        postTitleInput.readOnly = readonly;
        postCaptionInput.readOnly = readonly;
        scheduledDateInput.readOnly = readonly;
    }

    // リアルタイムプレビュー＆ハッシュタグハイライト
    function updateLivePreview() {
        const caption = postCaptionInput.value;
        charCounter.textContent = `${caption.length} / 2200文字`;

        if (caption.trim() === '') {
            igPreviewCaption.innerHTML = '投稿キャプションがここにリアルタイムで表示されます。';
        } else {
            // ハッシュタグと改行のフォーマット
            let formatted = escapeHtml(caption)
                .replace(/\n/g, '<br>')
                .replace(/(#[^\s#]+)/g, '<span class="hashtag">$1</span>');
            igPreviewCaption.innerHTML = formatted;
        }

        // メディアプレビュー
        if (selectedImages.length === 0) {
            igMediaWrapper.innerHTML = `<div class="ig-media-placeholder"><span>📷 画像を選択してください</span></div>`;
        } else {
            if (currentPreviewImgIndex >= selectedImages.length) {
                currentPreviewImgIndex = 0;
            }
            const currentImg = selectedImages[currentPreviewImgIndex];
            const isCarousel = selectedImages.length > 1;

            igMediaWrapper.innerHTML = `
                <img src="${currentImg}" alt="Preview">
                <div class="zoom-overlay">
                    <span style="font-size:1.4rem;">🔍</span>
                    <span>クリックして全画面拡大</span>
                </div>
                ${isCarousel ? `
                    <button class="carousel-btn prev" id="btnPrevImg">&lt;</button>
                    <button class="carousel-btn next" id="btnNextImg">&gt;</button>
                ` : ''}
            `;

            // クリックで高解像度拡大表示
            igMediaWrapper.onclick = (e) => {
                if (e.target.classList.contains('carousel-btn')) return;
                openLightbox();
            };

            if (isCarousel) {
                const btnPrev = document.getElementById('btnPrevImg');
                const btnNext = document.getElementById('btnNextImg');
                if (btnPrev) {
                    btnPrev.onclick = (e) => {
                        e.stopPropagation();
                        currentPreviewImgIndex = (currentPreviewImgIndex - 1 + selectedImages.length) % selectedImages.length;
                        updateLivePreview();
                    };
                }
                if (btnNext) {
                    btnNext.onclick = (e) => {
                        e.stopPropagation();
                        currentPreviewImgIndex = (currentPreviewImgIndex + 1) % selectedImages.length;
                        updateLivePreview();
                    };
                }
            }
        }
    }

    // 画像ファイルの処理（軽量リサイズ圧縮対応）
    function handleImageUpload(e) {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
        }
    }

    function resizeImage(file, maxWidth = 1080, quality = 0.85) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // 軽量なJPEGとしてBase64化
                    const resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(resizedDataUrl);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    async function processFiles(files) {
        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue;
            try {
                const resizedDataUrl = await resizeImage(file);
                selectedImages.push(resizedDataUrl);
                renderThumbnails();
                updateLivePreview();
            } catch (err) {
                console.error('Image resize error:', err);
            }
        }
    }

    function renderThumbnails() {
        imageThumbnails.innerHTML = '';
        selectedImages.forEach((imgSrc, idx) => {
            const item = document.createElement('div');
            item.className = 'thumb-item';
            item.innerHTML = `
                <img src="${imgSrc}" alt="thumb">
                <button type="button" class="thumb-remove" data-index="${idx}">&times;</button>
            `;
            item.querySelector('.thumb-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                selectedImages.splice(idx, 1);
                renderThumbnails();
                updateLivePreview();
            });
            imageThumbnails.appendChild(item);
        });
    }

    // コメントの描画
    function renderComments(comments) {
        commentsList.innerHTML = '';
        if (!comments || comments.length === 0) {
            commentsList.innerHTML = `<p style="font-size:0.75rem; color:var(--text-muted);">コメント履歴はありません</p>`;
            return;
        }

        comments.forEach(c => {
            const bubble = document.createElement('div');
            bubble.className = `comment-bubble ${c.actionStatus || ''}`;
            bubble.innerHTML = `
                <div class="comment-meta">
                    <span class="comment-author">${escapeHtml(c.author)}</span>
                    <span>${c.time || 'たった今'}</span>
                </div>
                <div>${escapeHtml(c.text)}</div>
            `;
            commentsList.appendChild(bubble);
        });
        commentsList.scrollTop = commentsList.scrollHeight;
    }

    // 保存・ステータス更新処理 (作成者)
    async function savePostWithStatus(targetStatus) {
        const title = postTitleInput.value.trim();
        const caption = postCaptionInput.value.trim();

        let hasError = false;
        if (!title) {
            postTitleInput.style.borderColor = 'var(--status-changes)';
            hasError = true;
        } else {
            postTitleInput.style.borderColor = 'var(--border-dark)';
        }

        if (!caption) {
            postCaptionInput.style.borderColor = 'var(--status-changes)';
            hasError = true;
        } else {
            postCaptionInput.style.borderColor = 'var(--border-dark)';
        }

        if (hasError) {
            alert('⚠️ 管理用タイトルとInstagramキャプションを入力してください。');
            return;
        }

        const id = postIdInput.value || 'post-' + Date.now();
        const existingIndex = posts.findIndex(p => p.id === id);

        const newPost = {
            id,
            title,
            caption,
            images: selectedImages.length > 0 ? selectedImages : ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'],
            status: targetStatus,
            scheduledDate: scheduledDateInput.value,
            createdAt: existingIndex >= 0 ? posts[existingIndex].createdAt : new Date().toISOString(),
            comments: existingIndex >= 0 ? posts[existingIndex].comments : []
        };

        if (existingIndex >= 0) {
            posts[existingIndex] = newPost;
        } else {
            posts.unshift(newPost);
        }

        await savePosts(newPost);

        // 承認申請時は自動的に「承認待ち」または「すべて」のフィルターを表示
        if (targetStatus === 'pending') {
            currentFilter = 'pending';
            navItems.forEach(n => {
                n.classList.toggle('active', n.dataset.filter === 'pending');
            });
            updatePageTitle();
        }

        render();
        closeEditorModal();

        const msg = targetStatus === 'pending' 
            ? '🚀 承認申請を提出しました！「承認待ち」リストに移動しました。' 
            : '📝 下書きを保存しました。';
        alert(msg);
    }

    // 承認者アクション処理
    async function handleReviewerAction(targetStatus) {
        if (!activePostId) return;
        const post = posts.find(p => p.id === activePostId);
        if (!post) return;

        const commentText = newCommentInput.value.trim();
        if (targetStatus === 'changes_requested' && !commentText) {
            alert('修正依頼をする場合は、理由や修正点をコメント欄に入力してください。');
            return;
        }

        post.status = targetStatus;
        if (commentText) {
            post.comments = post.comments || [];
            post.comments.push({
                id: 'c-' + Date.now(),
                author: '承認者：マネージャー',
                role: 'reviewer',
                text: commentText,
                actionStatus: targetStatus,
                time: 'たった今'
            });
        }

        await savePosts(post);
        render();
        closeEditorModal();

        const msg = targetStatus === 'approved' 
            ? '投稿を承認しました！「投稿完了」へ進めることができます。 ✅' 
            : '修正依頼を送信しました。 ⚠️';
        alert(msg);
    }

    // Instagramへの投稿処理 (デモモード / 実際のAPI連携)
    async function handlePublishToInstagram() {
        if (!activePostId) return;
        const post = posts.find(p => p.id === activePostId);
        if (!post) return;

        const confirmPublish = confirm(`以下の投稿をInstagramへ即時公開しますか？\n\nタイトル: ${post.title}`);
        if (!confirmPublish) return;

        // 設定の取得 (ローカルストレージの値を読み込み、空文字やデモ用初期値の場合は埋め込み設定を適用)
        let storedId = localStorage.getItem('instacheck_ig_account_id');
        let storedToken = localStorage.getItem('instacheck_ig_access_token');

        if (!storedId || storedId.trim() === '' || storedId === 'null' || storedId === 'undefined' || storedId === '17841400000000000 (デモ)' || storedId === '17841400000000000') {
            storedId = null;
        }
        if (!storedToken || storedToken.trim() === '' || storedToken === 'null' || storedToken === 'undefined' || storedToken === 'dummy_access_token_demo_12345') {
            storedToken = null;
        }

        const igAccountId = storedId || EMBEDDED_CONFIG.igAccountId;
        const igAccessToken = storedToken || EMBEDDED_CONFIG.igAccessToken;

        let isDemoMode = EMBEDDED_CONFIG.isDemoMode;
        if (localStorage.getItem('instacheck_demo_mode') !== null) {
            isDemoMode = localStorage.getItem('instacheck_demo_mode') !== 'false';
        }

        if (!isDemoMode && (!igAccountId || !igAccessToken || igAccountId.includes('デモ') || igAccessToken.includes('demo'))) {
            alert('⚠️ 実際のAPI連携を行うには、API設定から正しい「Instagram Business Account ID」と「User Access Token」を入力し、設定を保存してください。');
            return;
        }

        btnPublishNow.disabled = true;
        btnPublishNow.textContent = '投稿処理中... ⏳';

        if (isDemoMode) {
            // シミュレーションモード
            setTimeout(async () => {
                post.status = 'published';

                if (!post.insights) {
                    const reach = Math.floor(Math.random() * 15000) + 5000;
                    const impressions = Math.floor(reach * (1.2 + Math.random() * 0.4));
                    const saved = Math.floor(reach * (0.03 + Math.random() * 0.04));
                    const likes = Math.floor(reach * (0.05 + Math.random() * 0.08));
                    post.insights = { reach, impressions, saved, likes };
                }

                post.comments = post.comments || [];
                post.comments.push({
                    id: 'c-' + Date.now(),
                    author: 'システム (Instagram Graph API / デモモード)',
                    role: 'system',
                    text: '🚀 Instagram Graph API経由で正常に投稿が公開されました (Media ID: 179983940120391)',
                    actionStatus: 'published',
                    time: 'たった今'
                });

                await savePosts(post);
                render();
                btnPublishNow.disabled = false;
                btnPublishNow.textContent = 'Instagramへ今すぐ投稿 🚀';
                closeEditorModal();

                alert('✨ [デモモード] Instagramへの模擬投稿が正常に完了しました！');
            }, 1200);
            return;
        }

        // --- 本番API送信フロー ---
        try {
            const images = post.images || [];
            if (images.length === 0) {
                throw new Error('投稿する画像が登録されていません。');
            }

            btnPublishNow.textContent = '画像アップロード中... ⏳';

            // 1. 画像のパブリックURL化
            const publicImageUrls = [];
            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                if (img.startsWith('http://') || img.startsWith('https://')) {
                    publicImageUrls.push(img);
                } else if (img.startsWith('data:image/')) {
                    btnPublishNow.textContent = `画像アップロード中 (${i + 1}/${images.length})... ⏳`;
                    const publicUrl = await uploadToTemporaryHost(img);
                    publicImageUrls.push(publicUrl);
                } else {
                    throw new Error('画像のデータ形式が不正です。');
                }
            }

            btnPublishNow.textContent = 'コンテナ作成中... ⏳';

            let publishedMediaId = '';

            if (publicImageUrls.length === 1) {
                // --- 単一画像の投稿 ---
                // A. メディアコンテナ作成
                const createRes = await fetch(`https://graph.facebook.com/v18.0/${igAccountId}/media`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image_url: publicImageUrls[0],
                        caption: post.caption,
                        access_token: igAccessToken
                    })
                });

                const createData = await createRes.json();
                if (createData.error) {
                    throw new Error(createData.error.message || 'コンテナ作成に失敗しました。');
                }

                const creationId = createData.id;

                btnPublishNow.textContent = '投稿公開中... ⏳';

                // B. メディア公開
                const publishRes = await fetch(`https://graph.facebook.com/v18.0/${igAccountId}/media_publish`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        creation_id: creationId,
                        access_token: igAccessToken
                    })
                });

                const publishData = await publishRes.json();
                if (publishData.error) {
                    throw new Error(publishData.error.message || 'メディアの公開に失敗しました。');
                }

                publishedMediaId = publishData.id;

            } else {
                // --- 複数画像（カルーセル）の投稿 ---
                // A. 各画像のアイテムコンテナ作成
                const itemIds = [];
                for (let i = 0; i < publicImageUrls.length; i++) {
                    btnPublishNow.textContent = `画像コンテナ作成中 (${i + 1}/${publicImageUrls.length})... ⏳`;
                    const itemRes = await fetch(`https://graph.facebook.com/v18.0/${igAccountId}/media`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            image_url: publicImageUrls[i],
                            is_carousel_item: true,
                            access_token: igAccessToken
                        })
                    });

                    const itemData = await itemRes.json();
                    if (itemData.error) {
                        throw new Error(itemData.error.message || `画像 ${i + 1} のコンテナ作成に失敗しました。`);
                    }
                    itemIds.push(itemData.id);
                }

                btnPublishNow.textContent = 'カルーセルコンテナ作成中... ⏳';

                // B. カルーセル親コンテナ作成
                const carouselRes = await fetch(`https://graph.facebook.com/v18.0/${igAccountId}/media`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        media_type: 'CAROUSEL',
                        children: itemIds.join(','),
                        caption: post.caption,
                        access_token: igAccessToken
                    })
                });

                const carouselData = await carouselRes.json();
                if (carouselData.error) {
                    throw new Error(carouselData.error.message || 'カルーセルコンテナの作成に失敗しました。');
                }

                const creationId = carouselData.id;

                btnPublishNow.textContent = '投稿公開中... ⏳';

                // C. メディア公開
                const publishRes = await fetch(`https://graph.facebook.com/v18.0/${igAccountId}/media_publish`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        creation_id: creationId,
                        access_token: igAccessToken
                    })
                });

                const publishData = await publishRes.json();
                if (publishData.error) {
                    throw new Error(publishData.error.message || 'カルーセルメディアの公開に失敗しました。');
                }

                publishedMediaId = publishData.id;
            }

            // 成功時の処理
            post.status = 'published';
            post.insights = { reach: 0, impressions: 0, saved: 0, likes: 0 }; // 新規投稿のため0初期化

            post.comments = post.comments || [];
            post.comments.push({
                id: 'c-' + Date.now(),
                author: 'システム (Instagram Graph API)',
                role: 'system',
                text: `🚀 Instagramへの自動投稿が正常に完了しました (Media ID: ${publishedMediaId})`,
                actionStatus: 'published',
                time: 'たった今'
            });

            await savePosts(post);
            render();
            closeEditorModal();

            alert('✨ Instagramへの自動投稿が正常に完了しました！実際に公開されています。');

        } catch (error) {
            console.error('API integration error:', error);
            alert(`❌ Instagramへの投稿中にエラーが発生しました:\n${error.message}`);
        } finally {
            btnPublishNow.disabled = false;
            btnPublishNow.textContent = 'Instagramへ今すぐ投稿 🚀';
        }
    }

    // 削除処理
    async function handleDeletePost() {
        if (!activePostId) return;
        if (confirm('この投稿を削除してもよろしいですか？')) {
            const deleteId = activePostId;
            posts = posts.filter(p => p.id !== deleteId);
            savePostsLocalStorage();
            await deletePostFromSupabase(deleteId);
            render();
            closeEditorModal();
        }
    }

    // ユーティリティ関数
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
    }

    function formatDate(isoString) {
        if (!isoString) return '';
        const d = new Date(isoString);
        return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    function getStatusLabel(status) {
        const map = {
            draft: '下書き',
            pending: '承認待ち',
            changes_requested: '修正依頼中',
            approved: '承認済み',
            published: '投稿完了'
        };
        return map[status] || status;
    }
});
