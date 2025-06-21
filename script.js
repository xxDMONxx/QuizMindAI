// Estado global de la aplicación
let appState = {
    apiKey: '',
    model: 'gemini-2.5-flash-preview-0520',
    content: '',
    files: [], // Array para múltiples archivos
    quizType: '',
    questions: [],
    currentQuestion: 0,
    answers: [],
    startTime: null,
    endTime: null,
    isQuizActive: false
};

// Variables para música
let currentMusic = null;
let musicTitle = '';

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    setupFileUpload();
    setupMusicPlayer();
    loadSavedData();
}

function setupEventListeners() {
    // Navegación entre pasos
    document.getElementById('nextStep1').addEventListener('click', validateStep1);
    document.getElementById('nextStep2').addEventListener('click', validateStep2);
    document.getElementById('generateQuiz').addEventListener('click', generateQuiz);
    
    // Controles del quiz
    document.getElementById('prevQuestion').addEventListener('click', previousQuestion);
    document.getElementById('nextQuestion').addEventListener('click', nextQuestion);
    document.getElementById('finishQuiz').addEventListener('click', finishQuiz);
    
    // Acciones de resultados
    document.getElementById('retakeQuiz').addEventListener('click', retakeQuiz);
    document.getElementById('newQuiz').addEventListener('click', newQuiz);
    
    // Tabs de contenido
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', switchTab);
    });
    
    // Tipos de quiz
    document.querySelectorAll('.quiz-type').forEach(type => {
        type.addEventListener('click', selectQuizType);
    });
    
    // Modelos
    document.getElementById('refreshModels').addEventListener('click', refreshAvailableModels);
    
    // Música
    document.getElementById('musicToggle').addEventListener('click', toggleMusicModal);
    document.getElementById('loadMusic').addEventListener('click', loadMusic);
    document.getElementById('searchMusic').addEventListener('click', searchYouTubeMusic);
    document.getElementById('playPause').addEventListener('click', toggleMusic);
    document.getElementById('stopMusic').addEventListener('click', stopMusic);
    
    // Music tabs
    document.querySelectorAll('.music-tab-btn').forEach(btn => {
        btn.addEventListener('click', switchMusicTab);
    });
    
    // Suggestion tags
    document.querySelectorAll('.suggestion-tag').forEach(tag => {
        tag.addEventListener('click', function() {
            const searchTerm = this.dataset.search;
            document.getElementById('musicSearch').value = searchTerm;
            searchYouTubeMusic();
        });
    });
    
    // Enter key search
    document.getElementById('musicSearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchYouTubeMusic();
        }
    });
    
    // Modal
    document.querySelector('.close').addEventListener('click', closeMusicModal);
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('musicModal');
        if (e.target === modal) {
            closeMusicModal();
        }
    });
}

function setupFileUpload() {
    const fileInput = document.getElementById('pdfFile');
    const fileUpload = document.querySelector('.file-upload');
    
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    fileUpload.addEventListener('dragover', function(e) {
        e.preventDefault();
        fileUpload.style.borderColor = 'var(--primary-color)';
        fileUpload.style.background = 'rgba(102, 126, 234, 0.05)';
    });
    
    fileUpload.addEventListener('dragleave', function(e) {
        e.preventDefault();
        fileUpload.style.borderColor = 'var(--border-color)';
        fileUpload.style.background = '';
    });
    
    fileUpload.addEventListener('drop', function(e) {
        e.preventDefault();
        fileUpload.style.borderColor = 'var(--border-color)';
        fileUpload.style.background = '';
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            fileInput.files = files;
            handleFileSelect();
        }
    });
}

function setupMusicPlayer() {
    // Configuración inicial del reproductor
    updateMusicTitle('Sin música cargada');
}

function loadSavedData() {
    // Cargar datos guardados del localStorage
    const savedApiKey = localStorage.getItem('ai-quiz-api-key');
    const savedModel = localStorage.getItem('ai-quiz-model');
    const savedYouTubeKey = localStorage.getItem('youtube-api-key');
    
    if (savedApiKey) {
        document.getElementById('apiKey').value = savedApiKey;
    }
    
    if (savedModel) {
        document.getElementById('modelSelect').value = savedModel;
    }
    
    if (savedYouTubeKey) {
        document.getElementById('youtubeApiKey').value = savedYouTubeKey;
    }
}

// Validación del paso 1
function validateStep1() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('modelSelect').value;
    const youtubeApiKey = document.getElementById('youtubeApiKey').value.trim();
    
    if (!apiKey) {
        showError('Por favor, ingresa tu API key de Google AI Studio');
        return;
    }
    
    // Guardar configuración
    appState.apiKey = apiKey;
    appState.model = model;
    
    // Guardar en localStorage
    localStorage.setItem('ai-quiz-api-key', apiKey);
    localStorage.setItem('ai-quiz-model', model);
    
    if (youtubeApiKey) {
        localStorage.setItem('youtube-api-key', youtubeApiKey);
    }
    
    // Avanzar al siguiente paso
    showStep(2);
}

// Validación del paso 2
function validateStep2() {
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    
    if (activeTab === 'text') {
        const textContent = document.getElementById('textContent').value.trim();
        if (!textContent) {
            showError('Por favor, ingresa el contenido del tema');
            return;
        }
        appState.content = textContent;
        appState.files = []; // Limpiar archivos si usamos texto
    } else if (activeTab === 'pdf') {
        if (appState.files.length === 0) {
            showError('Por favor, selecciona al menos un archivo PDF o imagen');
            return;
        }
        
        // Combinar contenido de archivos de texto
        let combinedText = '';
        appState.files.forEach(file => {
            if (file.fileType === 'pdf' && file.content) {
                combinedText += `\n--- Contenido de ${file.name} ---\n${file.content}\n`;
            }
        });
        
        appState.content = combinedText.trim();
        
        // Las imágenes se procesarán por separado en la generación del quiz
    }
    
    showStep(3);
}

// Manejo de selección de archivos
async function handleFileSelect() {
    const files = Array.from(document.getElementById('pdfFile').files);
    
    // Limitar a 5 archivos
    if (files.length > 5) {
        showError('Máximo 5 archivos permitidos. Se seleccionarán los primeros 5.');
        files.splice(5);
    }
    
    const preview = document.getElementById('pdfPreview');
    const counter = document.getElementById('fileCounter');
    const countSpan = document.getElementById('fileCount');
    
    // Actualizar contador
    countSpan.textContent = files.length;
    updateFileCounter(files.length);
    
    if (files.length === 0) {
        preview.classList.remove('show');
        appState.files = [];
        return;
    }
    
    preview.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Procesando archivos...</p>';
    preview.classList.add('show');
    
    try {
        const processedFiles = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileData = {
                name: file.name,
                size: file.size,
                type: file.type,
                content: null
            };
            
            if (file.type === 'application/pdf') {
                fileData.content = await extractTextFromPDF(file);
                fileData.fileType = 'pdf';
            } else if (file.type.startsWith('image/')) {
                fileData.content = await convertImageToBase64(file);
                fileData.fileType = 'image';
            }
            
            processedFiles.push(fileData);
        }
        
        appState.files = processedFiles;
        displayFilePreview(processedFiles);
        
    } catch (error) {
        preview.innerHTML = `<p style="color: var(--error-color);"><i class="fas fa-exclamation-triangle"></i> Error al procesar archivos: ${error.message}</p>`;
    }
}

function updateFileCounter(count) {
    const counter = document.getElementById('fileCounter');
    counter.classList.remove('warning', 'error');
    
    if (count >= 4) {
        counter.classList.add('warning');
    }
    if (count >= 5) {
        counter.classList.add('error');
    }
}

function displayFilePreview(files) {
    const preview = document.getElementById('pdfPreview');
    
    let html = '<div class="files-list">';
    
    files.forEach((file, index) => {
        const iconClass = file.fileType === 'pdf' ? 'fas fa-file-pdf pdf' : 'fas fa-image image';
        const sizeText = (file.size / 1024 / 1024).toFixed(2) + ' MB';
        
        html += `
            <div class="file-item" data-index="${index}">
                <div class="file-info">
                    <div class="file-icon ${file.fileType}">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${sizeText}</div>
                    </div>
                </div>
                <button class="file-remove" onclick="removeFile(${index})">
                    <i class="fas fa-times"></i>
                    Eliminar
                </button>
            </div>
        `;
    });
    
    html += '</div>';
    preview.innerHTML = html;
}

// Función global para remover archivos (llamada desde el HTML)
window.removeFile = removeFile;
window.selectMusic = selectMusic;

function updatePlayerStatus(message) {
    const statusElement = document.getElementById('playerStatus');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Función global para remover archivos
function removeFile(index) {
    appState.files.splice(index, 1);
    
    // Actualizar el input file
    const fileInput = document.getElementById('pdfFile');
    const dt = new DataTransfer();
    
    appState.files.forEach(fileData => {
        // Note: No podemos recrear el File object original, así que limpiamos el input
    });
    
    fileInput.value = '';
    
    // Actualizar UI
    const countSpan = document.getElementById('fileCount');
    countSpan.textContent = appState.files.length;
    updateFileCounter(appState.files.length);
    
    if (appState.files.length === 0) {
        document.getElementById('pdfPreview').classList.remove('show');
    } else {
        displayFilePreview(appState.files);
    }
}

// Convertir imagen a base64
async function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Error al leer la imagen'));
        reader.readAsDataURL(file);
    });
}

// Extracción de texto de PDF
async function extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const arrayBuffer = e.target.result;
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }
                
                resolve(fullText.trim());
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsArrayBuffer(file);
    });
}

// Cambio de tabs
function switchTab(e) {
    const tabName = e.target.dataset.tab;
    
    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Mostrar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// Selección de tipo de quiz
function selectQuizType(e) {
    const type = e.currentTarget.dataset.type;
    
    // Actualizar selección visual
    document.querySelectorAll('.quiz-type').forEach(qt => {
        qt.classList.remove('selected');
    });
    e.currentTarget.classList.add('selected');
    
    appState.quizType = type;
}

// Obtener modelos disponibles de Google AI Studio
async function refreshAvailableModels() {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        updateModelStatus('Primero ingresa tu API key para obtener los modelos disponibles', 'error');
        return;
    }
    
    const refreshBtn = document.getElementById('refreshModels');
    const modelSelect = document.getElementById('modelSelect');
    const currentValue = modelSelect.value;
    
    // UI loading state
    refreshBtn.disabled = true;
    refreshBtn.classList.add('loading');
    updateModelStatus('Obteniendo modelos disponibles...', '');
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error de API: ${response.status}`);
        }
        
        const data = await response.json();
        const models = data.models || [];
        
        // Filtrar solo modelos Gemini que soportan generateContent y excluir pro/tts
        const geminiModels = models.filter(model => {
            const modelName = model.name.replace('models/', '');
            return modelName.startsWith('gemini') && 
                   model.supportedGenerationMethods && 
                   model.supportedGenerationMethods.includes('generateContent') &&
                   !modelName.includes('pro') &&
                   !modelName.includes('tts') &&
                   !modelName.includes('text-to-speech');
        });
        
        if (geminiModels.length === 0) {
            throw new Error('No se encontraron modelos Gemini compatibles');
        }
        
        // Actualizar select con modelos obtenidos
        updateModelSelect(geminiModels, currentValue);
        updateModelStatus(`✓ Se encontraron ${geminiModels.length} modelos disponibles`, 'success');
        
    } catch (error) {
        console.error('Error fetching models:', error);
        updateModelStatus(`Error: ${error.message}`, 'error');
        
        // Mantener modelos por defecto en caso de error
        resetDefaultModels(currentValue);
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.classList.remove('loading');
    }
}

function updateModelSelect(models, currentValue) {
    const modelSelect = document.getElementById('modelSelect');
    
    // Limpiar opciones actuales
    modelSelect.innerHTML = '';
    
    // Ordenar modelos: Flash Preview primero, luego otros
    const sortedModels = models.sort((a, b) => {
        const aName = a.name.replace('models/', '');
        const bName = b.name.replace('models/', '');
        
        // Priorizar modelos Flash Preview
        const aIsFlashPreview = aName.includes('flash-preview') || aName.includes('2.5-flash');
        const bIsFlashPreview = bName.includes('flash-preview') || bName.includes('2.5-flash');
        
        if (aIsFlashPreview && !bIsFlashPreview) return -1;
        if (!aIsFlashPreview && bIsFlashPreview) return 1;
        
        // Dentro de Flash Preview, ordenar por versión (más reciente primero)
        if (aIsFlashPreview && bIsFlashPreview) {
            return bName.localeCompare(aName);
        }
        
        // Para otros modelos, ordenar alfabéticamente
        return aName.localeCompare(bName);
    });
    
    // Agregar modelos obtenidos de la API
    sortedModels.forEach(model => {
        const modelName = model.name.replace('models/', '');
        const displayName = formatModelDisplayName(modelName, model);
        
        const option = document.createElement('option');
        option.value = modelName;
        option.textContent = displayName;
        
        modelSelect.appendChild(option);
    });
    
    // Actualizar recomendación dinámicamente
    updateModelRecommendation(sortedModels);
    
    // Intentar mantener la selección anterior
    if (currentValue && Array.from(modelSelect.options).some(opt => opt.value === currentValue)) {
        modelSelect.value = currentValue;
    } else {
        // Si no hay selección válida, seleccionar el modelo recomendado si está disponible
        const recommendedModel = findRecommendedModel(sortedModels);
        if (recommendedModel) {
            modelSelect.value = recommendedModel.name.replace('models/', '');
        } else if (modelSelect.options.length > 0) {
            modelSelect.selectedIndex = 0;
        }
    }
}

function formatModelDisplayName(modelName, modelInfo) {
    // Crear nombres más descriptivos para los modelos
    const nameMap = {
        'gemini-1.5-flash': 'Gemini 1.5 Flash (Rápido y eficiente)',
        'gemini-1.5-flash-8b': 'Gemini 1.5 Flash 8B (Ultra rápido)',
        'gemini-2.0-flash-exp': 'Gemini 2.0 Flash (Experimental)',
        'gemini-2.5-flash-preview-0514': 'Gemini 2.5 Flash Preview 05-14 ⭐ (Recomendado)',
        'gemini-2.5-flash-preview-0520': 'Gemini 2.5 Flash Preview 05-20 ⭐ (Recomendado)',
    };
    
    // Si tenemos un nombre personalizado, usarlo
    if (nameMap[modelName]) {
        return nameMap[modelName];
    }
    
    // Si no, crear uno basado en el nombre
    let displayName = modelName.charAt(0).toUpperCase() + modelName.slice(1);
    displayName = displayName.replace(/-/g, ' ');
    
    // Agregar información adicional si está disponible
    if (modelInfo.displayName && modelInfo.displayName !== modelName) {
        displayName = modelInfo.displayName;
    }
    
    return displayName;
}

function resetDefaultModels(currentValue) {
    const modelSelect = document.getElementById('modelSelect');
    modelSelect.innerHTML = `
        <option value="gemini-2.5-flash-preview-0520">Gemini 2.5 Flash Preview 05-20 ⭐ (Recomendado)</option>
        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Rápido)</option>
        <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
        <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash 8B (Ultra rápido)</option>
    `;
    
    if (currentValue && Array.from(modelSelect.options).some(opt => opt.value === currentValue)) {
        modelSelect.value = currentValue;
    }
}

// Función para encontrar el modelo Flash Preview más reciente
function findRecommendedModel(models) {
    // Buscar modelos Flash Preview ordenados por fecha
    const flashPreviewModels = models.filter(model => {
        const modelName = model.name.replace('models/', '');
        return modelName.includes('flash-preview') || 
               (modelName.includes('2.5-flash') && modelName.includes('preview'));
    });
    
    if (flashPreviewModels.length > 0) {
        // Retornar el primero (ya están ordenados por fecha, más reciente primero)
        return flashPreviewModels[0];
    }
    
    return null;
}

// Función para actualizar la recomendación dinámicamente
function updateModelRecommendation(models) {
    const recommendationDiv = document.querySelector('.model-recommendation');
    const recommendedModelSpan = document.querySelector('.recommended-model');
    const reasonSpan = document.querySelector('.recommendation-reason');
    
    if (!recommendationDiv || !recommendedModelSpan || !reasonSpan) return;
    
    const recommendedModel = findRecommendedModel(models);
    
    if (recommendedModel) {
        const modelName = recommendedModel.name.replace('models/', '');
        const displayName = modelName.replace('gemini-', '').replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        
        recommendedModelSpan.textContent = displayName;
        reasonSpan.textContent = 'El modelo Flash Preview más actual, gratis y con mejor rendimiento';
        recommendationDiv.style.display = 'flex';
    } else {
        // Si no hay Flash Preview disponible, recomendar Flash estándar
        const flashModels = models.filter(model => {
            const modelName = model.name.replace('models/', '');
            return modelName.includes('1.5-flash') && !modelName.includes('pro');
        });
        
        if (flashModels.length > 0) {
            recommendedModelSpan.textContent = 'Gemini 1.5 Flash';
            reasonSpan.textContent = 'Modelo rápido y eficiente, ideal para la mayoría de casos de uso';
            recommendationDiv.style.display = 'flex';
        } else {
            recommendationDiv.style.display = 'none';
        }
    }
}

function updateModelStatus(message, type) {
    const statusElement = document.getElementById('modelStatus');
    statusElement.textContent = message;
    statusElement.className = type ? `${type}` : '';
}

// Generación del quiz
async function generateQuiz() {
    if (!appState.quizType) {
        showError('Por favor, selecciona un tipo de quiz');
        return;
    }
    
    const numQuestions = parseInt(document.getElementById('numQuestions').value);
    const difficulty = document.getElementById('difficulty').value;
    
    showLoading(true);
    
    try {
        const questions = await generateQuestionsWithAI(appState.content, appState.quizType, numQuestions, difficulty);
        appState.questions = questions;
        appState.answers = new Array(questions.length).fill(null);
        appState.currentQuestion = 0;
        
        showStep(4);
        startQuiz();
    } catch (error) {
        showError('Error al generar el quiz: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Generación de preguntas con IA
async function generateQuestionsWithAI(content, quizType, numQuestions, difficulty) {
    const prompt = createPrompt(content, quizType, numQuestions, difficulty);
    
    try {
        // Preparar el contenido para la API
        const parts = [{ text: prompt }];
        
        // Agregar imágenes si las hay
        const imageFiles = appState.files.filter(file => file.fileType === 'image');
        imageFiles.forEach(file => {
            parts.push({
                inline_data: {
                    mime_type: file.type,
                    data: file.content.split(',')[1] // Remover el prefijo data:image/...;base64,
                }
            });
        });
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${appState.model}:generateContent?key=${appState.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: parts
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error de API: ${response.status}`);
        }
        
        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;
        
        return parseGeneratedQuestions(generatedText, quizType);
    } catch (error) {
        throw new Error(`Error al conectar con la API: ${error.message}`);
    }
}

// Creación del prompt para la IA
function createPrompt(content, quizType, numQuestions, difficulty) {
    const difficultyMap = {
        easy: 'fácil',
        medium: 'intermedio',
        hard: 'difícil'
    };
    
    const hasImages = appState.files.some(file => file.fileType === 'image');
    const imageNote = hasImages ? '\n\nNOTA: También tienes acceso a las imágenes adjuntas. Puedes hacer preguntas sobre el contenido visual si es relevante.' : '';
    
    if (quizType === 'multiple-choice') {
        return `
Basándote en el siguiente contenido${hasImages ? ' y las imágenes adjuntas' : ''}, genera ${numQuestions} preguntas de opción múltiple de nivel ${difficultyMap[difficulty]}:

CONTENIDO:
${content}${imageNote}

INSTRUCCIONES:
- Cada pregunta debe tener exactamente 4 opciones (A, B, C, D)
- Solo una opción debe ser correcta
- Las opciones incorrectas deben ser plausibles pero claramente incorrectas
- Incluye una explicación de por qué la respuesta correcta es correcta y por qué las otras son incorrectas
${hasImages ? '- Puedes incluir preguntas sobre el contenido visual de las imágenes si es relevante' : ''}
- Usa el siguiente formato JSON:

{
  "questions": [
    {
      "question": "Texto de la pregunta",
      "options": {
        "A": "Opción A",
        "B": "Opción B",
        "C": "Opción C",
        "D": "Opción D"
      },
      "correct_answer": "A",
      "explanation": "Explicación detallada de por qué A es correcta y por qué B, C, D son incorrectas"
    }
  ]
}

Responde SOLO con el JSON válido, sin texto adicional.`;
    } else {
        return `
Basándote en el siguiente contenido${hasImages ? ' y las imágenes adjuntas' : ''}, genera ${numQuestions} preguntas de respuesta abierta de nivel ${difficultyMap[difficulty]}:

CONTENIDO:
${content}${imageNote}

INSTRUCCIONES:
- Las preguntas deben requerir respuestas desarrolladas y reflexivas
- Incluye una respuesta modelo para cada pregunta
${hasImages ? '- Puedes incluir preguntas sobre el contenido visual de las imágenes si es relevante' : ''}
- Usa el siguiente formato JSON:

{
  "questions": [
    {
      "question": "Texto de la pregunta",
      "model_answer": "Respuesta modelo detallada",
      "key_points": ["Punto clave 1", "Punto clave 2", "Punto clave 3"]
    }
  ]
}

Responde SOLO con el JSON válido, sin texto adicional.`;
    }
}

// Parseo de preguntas generadas
function parseGeneratedQuestions(generatedText, quizType) {
    try {
        // Limpiar el texto y extraer JSON
        let jsonText = generatedText.trim();
        
        // Buscar el JSON en el texto
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonText = jsonMatch[0];
        }
        
        const parsed = JSON.parse(jsonText);
        
        if (!parsed.questions || !Array.isArray(parsed.questions)) {
            throw new Error('Formato de respuesta inválido');
        }
        
        return parsed.questions;
    } catch (error) {
        throw new Error('Error al procesar las preguntas generadas: ' + error.message);
    }
}

// Iniciar quiz
function startQuiz() {
    appState.isQuizActive = true;
    appState.startTime = new Date();
    displayQuestion();
    startTimer();
}

// Mostrar pregunta actual
function displayQuestion() {
    const question = appState.questions[appState.currentQuestion];
    const questionNum = appState.currentQuestion + 1;
    const totalQuestions = appState.questions.length;
    
    // Actualizar progreso
    document.getElementById('currentQuestion').textContent = questionNum;
    document.getElementById('totalQuestions').textContent = totalQuestions;
    document.getElementById('questionNum').textContent = questionNum;
    
    const progressPercent = (questionNum / totalQuestions) * 100;
    document.querySelector('.progress-fill').style.width = progressPercent + '%';
    
    // Mostrar pregunta
    document.getElementById('questionText').textContent = question.question;
    
    // Mostrar opciones o input según el tipo
    const optionsContainer = document.getElementById('questionOptions');
    const inputContainer = document.getElementById('questionInput');
    
    if (appState.quizType === 'multiple-choice') {
        optionsContainer.style.display = 'flex';
        inputContainer.style.display = 'none';
        
        optionsContainer.innerHTML = '';
        Object.entries(question.options).forEach(([letter, text]) => {
            const option = document.createElement('div');
            option.className = 'option';
            option.dataset.value = letter;
            
            const isSelected = appState.answers[appState.currentQuestion] === letter;
            if (isSelected) {
                option.classList.add('selected');
            }
            
            option.innerHTML = `
                <div class="option-letter">${letter}</div>
                <div class="option-text">${text}</div>
            `;
            
            option.addEventListener('click', () => selectOption(letter));
            optionsContainer.appendChild(option);
        });
    } else {
        optionsContainer.style.display = 'none';
        inputContainer.style.display = 'block';
        
        const textarea = inputContainer.querySelector('textarea');
        textarea.value = appState.answers[appState.currentQuestion] || '';
        
        textarea.addEventListener('input', (e) => {
            appState.answers[appState.currentQuestion] = e.target.value;
        });
    }
    
    // Actualizar controles
    document.getElementById('prevQuestion').disabled = appState.currentQuestion === 0;
    
    const isLastQuestion = appState.currentQuestion === appState.questions.length - 1;
    document.getElementById('nextQuestion').style.display = isLastQuestion ? 'none' : 'inline-flex';
    document.getElementById('finishQuiz').style.display = isLastQuestion ? 'inline-flex' : 'none';
}

// Seleccionar opción
function selectOption(letter) {
    appState.answers[appState.currentQuestion] = letter;
    
    // Actualizar UI
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected');
    });
    document.querySelector(`[data-value="${letter}"]`).classList.add('selected');
}

// Navegación entre preguntas
function previousQuestion() {
    if (appState.currentQuestion > 0) {
        appState.currentQuestion--;
        displayQuestion();
    }
}

function nextQuestion() {
    if (appState.currentQuestion < appState.questions.length - 1) {
        appState.currentQuestion++;
        displayQuestion();
    }
}

// Timer del quiz
function startTimer() {
    const timerElement = document.getElementById('timer');
    
    setInterval(() => {
        if (!appState.isQuizActive) return;
        
        const now = new Date();
        const elapsed = now - appState.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// Finalizar quiz
async function finishQuiz() {
    appState.isQuizActive = false;
    appState.endTime = new Date();
    
    // Verificar que todas las preguntas estén respondidas
    const unanswered = appState.answers.filter(answer => !answer || answer.trim() === '').length;
    
    if (unanswered > 0) {
        const confirm = window.confirm(`Tienes ${unanswered} pregunta(s) sin responder. ¿Deseas continuar?`);
        if (!confirm) {
            appState.isQuizActive = true;
            return;
        }
    }
    
    showLoading(true);
    
    try {
        const results = await evaluateQuiz();
        displayResults(results);
        showStep(5);
    } catch (error) {
        showError('Error al evaluar el quiz: ' + error.message);
        appState.isQuizActive = true;
    } finally {
        showLoading(false);
    }
}

// Evaluación del quiz
async function evaluateQuiz() {
    const results = {
        score: 0,
        correct: 0,
        incorrect: 0,
        details: []
    };
    
    if (appState.quizType === 'multiple-choice') {
        // Evaluación automática para opción múltiple
        for (let i = 0; i < appState.questions.length; i++) {
            const question = appState.questions[i];
            const userAnswer = appState.answers[i];
            const isCorrect = userAnswer === question.correct_answer;
            
            if (isCorrect) {
                results.correct++;
            } else {
                results.incorrect++;
            }
            
            results.details.push({
                question: question.question,
                userAnswer: userAnswer,
                correctAnswer: question.correct_answer,
                isCorrect: isCorrect,
                explanation: question.explanation,
                options: question.options
            });
        }
    } else {
        // Evaluación con IA para respuestas abiertas
        for (let i = 0; i < appState.questions.length; i++) {
            const question = appState.questions[i];
            const userAnswer = appState.answers[i] || '';
            
            const evaluation = await evaluateOpenAnswer(question, userAnswer);
            
            if (evaluation.score >= 0.7) {
                results.correct++;
            } else {
                results.incorrect++;
            }
            
            results.details.push({
                question: question.question,
                userAnswer: userAnswer,
                modelAnswer: question.model_answer,
                score: evaluation.score,
                feedback: evaluation.feedback,
                keyPoints: question.key_points
            });
        }
    }
    
    results.score = Math.round((results.correct / appState.questions.length) * 100);
    
    return results;
}

// Evaluación de respuestas abiertas con IA
async function evaluateOpenAnswer(question, userAnswer) {
    const prompt = `
Evalúa la siguiente respuesta del estudiante:

PREGUNTA: ${question.question}

RESPUESTA DEL ESTUDIANTE: ${userAnswer}

RESPUESTA MODELO: ${question.model_answer}

PUNTOS CLAVE: ${question.key_points.join(', ')}

INSTRUCCIONES:
- Evalúa la respuesta en una escala de 0.0 a 1.0
- Considera la precisión, completitud y comprensión demostrada
- Proporciona feedback constructivo
- Usa el siguiente formato JSON:

{
  "score": 0.85,
  "feedback": "Feedback detallado explicando los puntos fuertes y áreas de mejora"
}

Responde SOLO con el JSON válido.`;
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${appState.model}:generateContent?key=${appState.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024
                }
            })
        });
        
        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;
        
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        throw new Error('Respuesta inválida de la IA');
    } catch (error) {
        // Fallback en caso de error
        return {
            score: 0.5,
            feedback: 'No se pudo evaluar automáticamente esta respuesta.'
        };
    }
}

// Mostrar resultados
function displayResults(results) {
    document.getElementById('finalScore').textContent = results.score;
    document.getElementById('correctAnswers').textContent = results.correct;
    document.getElementById('incorrectAnswers').textContent = results.incorrect;
    
    const totalTime = appState.endTime - appState.startTime;
    const minutes = Math.floor(totalTime / 60000);
    const seconds = Math.floor((totalTime % 60000) / 1000);
    document.getElementById('totalTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Mostrar detalles
    const breakdown = document.getElementById('resultsBreakdown');
    breakdown.innerHTML = '';
    
    results.details.forEach((detail, index) => {
        const item = document.createElement('div');
        item.className = `result-item ${appState.quizType === 'multiple-choice' ? (detail.isCorrect ? 'correct' : 'incorrect') : (detail.score >= 0.7 ? 'correct' : 'incorrect')}`;
        
        if (appState.quizType === 'multiple-choice') {
            item.innerHTML = `
                <div class="result-question">Pregunta ${index + 1}: ${detail.question}</div>
                <div class="result-answer">
                    <strong>Tu respuesta:</strong> ${detail.userAnswer ? `${detail.userAnswer}) ${detail.options[detail.userAnswer]}` : 'Sin respuesta'}
                </div>
                <div class="result-answer">
                    <strong>Respuesta correcta:</strong> ${detail.correctAnswer}) ${detail.options[detail.correctAnswer]}
                </div>
                <div class="result-explanation">${detail.explanation}</div>
            `;
        } else {
            item.innerHTML = `
                <div class="result-question">Pregunta ${index + 1}: ${detail.question}</div>
                <div class="result-answer">
                    <strong>Tu respuesta:</strong> ${detail.userAnswer || 'Sin respuesta'}
                </div>
                <div class="result-answer">
                    <strong>Puntuación:</strong> ${Math.round(detail.score * 100)}%
                </div>
                <div class="result-explanation">${detail.feedback}</div>
            `;
        }
        
        breakdown.appendChild(item);
    });
}

// Música
function toggleMusicModal() {
    document.getElementById('musicModal').style.display = 'block';
}

function closeMusicModal() {
    document.getElementById('musicModal').style.display = 'none';
}

function switchMusicTab(e) {
    const tabName = e.target.dataset.tab;
    
    // Actualizar botones
    document.querySelectorAll('.music-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Mostrar contenido
    document.querySelectorAll('.music-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
}

async function searchYouTubeMusic() {
    const searchTerm = document.getElementById('musicSearch').value.trim();
    if (!searchTerm) return;
    
    const resultsContainer = document.getElementById('searchResults');
    const searchBtn = document.getElementById('searchMusic');
    
    // UI loading state
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
    resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);"><i class="fas fa-spinner fa-spin"></i> Buscando música...</div>';
    
    try {
        const youtubeApiKey = localStorage.getItem('youtube-api-key');
        
        if (youtubeApiKey && youtubeApiKey.trim()) {
            // Usar API real de YouTube
            const results = await searchYouTubeReal(searchTerm, youtubeApiKey);
            displaySearchResults(results);
            updatePlayerStatus(`Se encontraron ${results.length} resultados reales para "${searchTerm}"`);
        } else {
            // Usar biblioteca curada (modo actual)
            const results = getStudyMusicResults(searchTerm);
            displaySearchResults(results);
            updatePlayerStatus(`Se encontraron ${results.length} resultados curados para "${searchTerm}" (Tip: Agrega YouTube API Key para búsqueda real)`);
        }
        
    } catch (error) {
        console.error('Error en búsqueda:', error);
        resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--error-color);">Error al buscar música. Intentando con biblioteca curada...</div>';
        
        // Fallback a biblioteca curada
        try {
            const results = getStudyMusicResults(searchTerm);
            displaySearchResults(results);
            updatePlayerStatus('Usando biblioteca curada (error en API de YouTube)');
        } catch (fallbackError) {
            resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--error-color);">Error al buscar música</div>';
            updatePlayerStatus('Error en la búsqueda');
        }
    } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search"></i> Buscar';
    }
}

// Búsqueda real en YouTube usando la API
async function searchYouTubeReal(query, apiKey) {
    const searchQuery = `${query} study music relaxing instrumental`;
    const maxResults = 6;
    
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=medium&videoDefinition=high&maxResults=${maxResults}&q=${encodeURIComponent(searchQuery)}&key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Cuota de YouTube API agotada o clave inválida');
            }
            throw new Error(`Error de YouTube API: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            throw new Error('No se encontraron resultados');
        }
        
        // Obtener duración de los videos
        const videoIds = data.items.map(item => item.id.videoId).join(',');
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`;
        
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        // Combinar resultados con duración
        const results = data.items.map((item, index) => {
            const duration = detailsData.items[index] ? 
                formatYouTubeDuration(detailsData.items[index].contentDetails.duration) : 
                'N/A';
            
            return {
                id: item.id.videoId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                duration: duration,
                thumbnail: item.snippet.thumbnails.medium?.url || '🎵'
            };
        });
        
        return results;
        
    } catch (error) {
        console.error('Error en YouTube API:', error);
        throw error;
    }
}

// Formatear duración de YouTube (PT1H30M20S -> 1:30:20)
function formatYouTubeDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 'N/A';
    
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

function getStudyMusicResults(searchTerm) {
    // Base de datos expandida de música para estudiar
    const musicDatabase = {
        'lofi hip hop study': [
            { id: 'jfKfPfyJRdk', title: 'lofi hip hop radio 📚 - beats to relax/study to', channel: 'Lofi Girl', duration: 'Live Stream', thumbnail: '🎵' },
            { id: 'DWcJFNfaw9c', title: 'Chill Lofi Study Beats - Deep Focus Mix', channel: 'ChilledCow', duration: '2:30:45', thumbnail: '🎶' },
            { id: '4xDzrJKXOOY', title: 'Lo-Fi Study Session - Productive Beats', channel: 'Peaceful Piano', duration: '1:45:20', thumbnail: '🎧' },
            { id: 'lTRiuFIWV54', title: 'Jazzy Hip Hop Lofi - Coffee Shop Vibes', channel: 'Jazz Lofi', duration: '3:12:15', thumbnail: '☕' }
        ],
        'classical music study': [
            { id: 'vQyT0jKZbPs', title: 'Classical Music for Studying & Brain Power - Mozart Effect', channel: 'Classical Tunes', duration: '3:15:30', thumbnail: '🎼' },
            { id: 'Qb6RgAWVGa4', title: 'Mozart for Studying - Classical Concentration', channel: 'Classical Vibes', duration: '2:45:15', thumbnail: '🎻' },
            { id: 'O6txOvK-mAk', title: 'Bach Study Playlist - Baroque Focus Music', channel: 'Baroque Classics', duration: '1:58:42', thumbnail: '🎹' },
            { id: '6p0DAz_30qQ', title: 'Chopin for Deep Study - Piano Masterpieces', channel: 'Piano Classics', duration: '2:33:28', thumbnail: '🎼' }
        ],
        'ambient study music': [
            { id: 'hlWiI4xVXKY', title: 'Ambient Study Music - Deep Focus & Concentration', channel: 'Ambient Worlds', duration: '4:12:33', thumbnail: '🌊' },
            { id: 'NugFranWHjg', title: 'Space Ambient for Studying - Cosmic Soundscapes', channel: 'Space Sounds', duration: '3:33:21', thumbnail: '🌌' },
            { id: 'kHnFXp6t7M0', title: 'Rain Sounds + Ambient Music - Study Environment', channel: 'Nature Sounds', duration: '2:15:45', thumbnail: '🌧️' },
            { id: '36YnV9STBqc', title: 'Dark Ambient Study - Night Study Session', channel: 'Dark Ambient', duration: '5:20:12', thumbnail: '🌙' }
        ],
        'jazz study music': [
            { id: 'Dx5qFachd3A', title: 'Smooth Jazz for Studying - Relaxing Background', channel: 'Jazz Café', duration: '2:28:17', thumbnail: '🎷' },
            { id: 'neV3EPgvZ3g', title: 'Coffee Shop Jazz - Study Atmosphere', channel: 'Jazz Radio', duration: '1:52:30', thumbnail: '☕' },
            { id: 'fEvM-OUbaKs', title: 'Relaxing Piano Jazz - Instrumental Focus', channel: 'Piano Jazz', duration: '3:05:22', thumbnail: '🎹' },
            { id: '2SXWcd5pJDM', title: 'Bossa Nova Study Music - Brazilian Jazz', channel: 'Bossa Nova Café', duration: '2:44:18', thumbnail: '🏖️' }
        ],
        'piano study music': [
            { id: 'THDM8Hka0dM', title: 'Peaceful Piano Music for Studying - Calm Focus', channel: 'Peaceful Piano', duration: '2:45:18', thumbnail: '🎹' },
            { id: 'ICCyiNbCH40', title: 'Piano Instrumental Study Music - Deep Work', channel: 'Study Piano', duration: '1:33:27', thumbnail: '🎼' },
            { id: 'lFcSrYw-ARY', title: 'Classical Piano for Focus - Mindful Study', channel: 'Focus Music', duration: '3:12:45', thumbnail: '🎵' },
            { id: 'iJQhpCULKhY', title: 'Modern Piano Study - Contemporary Instrumental', channel: 'Modern Classical', duration: '2:28:33', thumbnail: '🎹' }
        ],
        'nature sounds study': [
            { id: '3sL0omwElxw', title: 'Rain Sounds for Studying - 8 Hours Focus', channel: 'Nature Sounds Pro', duration: '8:00:00', thumbnail: '🌧️' },
            { id: 'McVL4M6VhkY', title: 'Forest Sounds + Birds - Natural Study Environment', channel: 'Forest Ambience', duration: '4:33:12', thumbnail: '🌲' },
            { id: 'wzjWIxXBs_s', title: 'Ocean Waves Study Sounds - Beach Focus', channel: 'Ocean Sounds', duration: '6:15:30', thumbnail: '🌊' },
            { id: 'nDq6TstdEi8', title: 'Thunderstorm for Studying - Deep Concentration', channel: 'Storm Sounds', duration: '3:45:22', thumbnail: '⛈️' },
            { id: 'CmZUJi88TNw', title: 'Mountain Stream - Water Sounds for Focus', channel: 'Water Sounds', duration: '4:22:18', thumbnail: '🏔️' }
        ],
        // Agregar más categorías
        'electronic study': [
            { id: 'YeaGUfZM5hs', title: 'Chill Electronic Study - Future Bass Mix', channel: 'Electronic Chill', duration: '2:18:45', thumbnail: '🎛️' },
            { id: 'V1eBtrZkNyM', title: 'Synthwave Study Session - Retro Focus', channel: 'Synthwave Radio', duration: '1:55:33', thumbnail: '🌆' },
            { id: 'Bf6fhKP9wgI', title: 'Ambient Techno for Deep Work', channel: 'Techno Study', duration: '3:08:27', thumbnail: '🔘' }
        ],
        'study music': [
            // Mezcla de los mejores de todas las categorías
            { id: 'jfKfPfyJRdk', title: 'lofi hip hop radio 📚 - beats to relax/study to', channel: 'Lofi Girl', duration: 'Live Stream', thumbnail: '🎵' },
            { id: 'vQyT0jKZbPs', title: 'Classical Music for Studying & Brain Power', channel: 'Classical Tunes', duration: '3:15:30', thumbnail: '🎼' },
            { id: 'hlWiI4xVXKY', title: 'Ambient Study Music - Deep Focus', channel: 'Ambient Worlds', duration: '4:12:33', thumbnail: '🌊' },
            { id: 'Dx5qFachd3A', title: 'Smooth Jazz for Studying', channel: 'Jazz Café', duration: '2:28:17', thumbnail: '🎷' },
            { id: '3sL0omwElxw', title: 'Rain Sounds for Studying', channel: 'Nature Sounds Pro', duration: '8:00:00', thumbnail: '🌧️' },
            { id: 'THDM8Hka0dM', title: 'Peaceful Piano Music for Studying', channel: 'Peaceful Piano', duration: '2:45:18', thumbnail: '🎹' }
        ]
    };
    
    // Buscar coincidencias de manera más inteligente
    const normalizedSearch = searchTerm.toLowerCase();
    let results = [];
    
    // 1. Buscar coincidencia exacta primero
    if (musicDatabase[normalizedSearch]) {
        results = [...musicDatabase[normalizedSearch]];
    } else {
        // 2. Buscar por palabras clave
        const keywords = normalizedSearch.split(' ');
        
        Object.keys(musicDatabase).forEach(category => {
            const categoryWords = category.split(' ');
            
            // Verificar si alguna palabra clave coincide
            const hasMatch = keywords.some(keyword => 
                categoryWords.some(catWord => 
                    catWord.includes(keyword) || keyword.includes(catWord)
                )
            );
            
            if (hasMatch) {
                results = [...results, ...musicDatabase[category]];
            }
        });
        
        // 3. Búsqueda por género específico
        if (normalizedSearch.includes('classical') || normalizedSearch.includes('mozart') || normalizedSearch.includes('bach')) {
            results = [...results, ...musicDatabase['classical music study']];
        }
        if (normalizedSearch.includes('jazz') || normalizedSearch.includes('smooth')) {
            results = [...results, ...musicDatabase['jazz study music']];
        }
        if (normalizedSearch.includes('lofi') || normalizedSearch.includes('lo-fi') || normalizedSearch.includes('hip hop')) {
            results = [...results, ...musicDatabase['lofi hip hop study']];
        }
        if (normalizedSearch.includes('piano') || normalizedSearch.includes('instrumental')) {
            results = [...results, ...musicDatabase['piano study music']];
        }
        if (normalizedSearch.includes('ambient') || normalizedSearch.includes('atmosphere')) {
            results = [...results, ...musicDatabase['ambient study music']];
        }
        if (normalizedSearch.includes('rain') || normalizedSearch.includes('nature') || normalizedSearch.includes('forest')) {
            results = [...results, ...musicDatabase['nature sounds study']];
        }
        if (normalizedSearch.includes('electronic') || normalizedSearch.includes('synthwave') || normalizedSearch.includes('techno')) {
            results = [...results, ...musicDatabase['electronic study']];
        }
        
        // 4. Si no hay coincidencias específicas, usar categoría general
        if (results.length === 0) {
            results = [...musicDatabase['study music']];
        }
    }
    
    // Eliminar duplicados y limitar resultados
    const uniqueResults = results.filter((result, index, self) => 
        index === self.findIndex(r => r.id === result.id)
    );
    
    return uniqueResults.slice(0, 6); // Máximo 6 resultados
}

function displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    
    if (results.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No se encontraron resultados</div>';
        return;
    }
    
    let html = '';
    results.forEach(result => {
        // Determinar si es thumbnail real o emoji
        const isRealThumbnail = result.thumbnail && result.thumbnail.startsWith('http');
        const thumbnailContent = isRealThumbnail ? 
            `<img src="${result.thumbnail}" alt="Thumbnail" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">` :
            result.thumbnail;
        
        html += `
            <div class="search-result-item" onclick="selectMusic('${result.id}', '${result.title.replace(/'/g, "\\'")}')">
                <div class="result-thumbnail">${thumbnailContent}</div>
                <div class="result-info">
                    <div class="result-title">${result.title}</div>
                    <div class="result-channel">${result.channel}</div>
                    <div class="result-duration">${result.duration}</div>
                </div>
                <button class="result-play-btn" onclick="event.stopPropagation(); selectMusic('${result.id}', '${result.title.replace(/'/g, "\\'")}')">
                    <i class="fas fa-play"></i>
                    Reproducir
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function selectMusic(videoId, title) {
    loadMusicById(videoId, title);
    updatePlayerStatus(`Cargando: ${title}`);
}

function loadMusicById(videoId, title) {
    currentMusic = videoId;
    musicTitle = title;
    
    const playerContainer = document.getElementById('musicPlayer');
    playerContainer.innerHTML = `
        <iframe id="youtubePlayer" width="100%" height="200" 
                src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0" 
                frameborder="0" allowfullscreen></iframe>
        <div class="player-controls">
            <button id="playPause"><i class="fas fa-play"></i></button>
            <button id="stopMusic"><i class="fas fa-stop"></i></button>
            <span id="musicTitle">${musicTitle}</span>
        </div>
        <div class="player-info">
            <small id="playerStatus">Música cargada - Lista para reproducir</small>
        </div>
    `;
    
    updateMusicTitle(musicTitle);
    
    // Reconfigurar event listeners
    document.getElementById('playPause').addEventListener('click', toggleMusic);
    document.getElementById('stopMusic').addEventListener('click', stopMusic);
}

function loadMusic() {
    const url = document.getElementById('musicUrl').value.trim();
    if (!url) {
        showError('Por favor, ingresa una URL válida');
        return;
    }
    
    // Extraer ID del video de YouTube
    const videoId = extractYouTubeId(url);
    if (!videoId) {
        showError('URL de YouTube no válida');
        return;
    }
    
    // Crear iframe del reproductor
    currentMusic = videoId;
    musicTitle = 'Música de YouTube';
    
    const playerContainer = document.getElementById('musicPlayer');
    playerContainer.innerHTML = `
        <iframe id="youtubePlayer" width="100%" height="200" 
                src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0" 
                frameborder="0" allowfullscreen></iframe>
        <div class="player-controls">
            <button id="playPause"><i class="fas fa-play"></i></button>
            <button id="stopMusic"><i class="fas fa-stop"></i></button>
            <span id="musicTitle">${musicTitle}</span>
        </div>
    `;
    
    updateMusicTitle(musicTitle);
    
    // Reconfigurar event listeners
    document.getElementById('playPause').addEventListener('click', toggleMusic);
    document.getElementById('stopMusic').addEventListener('click', stopMusic);
}

function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function toggleMusic() {
    // Esta función controlaría el reproductor de YouTube
    // Por limitaciones del iframe, se simplifica
    const btn = document.getElementById('playPause');
    const icon = btn.querySelector('i');
    
    if (icon.classList.contains('fa-play')) {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
    } else {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
    }
}

function stopMusic() {
    const iframe = document.getElementById('youtubePlayer');
    if (iframe) {
        iframe.src = iframe.src; // Reiniciar iframe
    }
    
    const btn = document.getElementById('playPause');
    const icon = btn.querySelector('i');
    icon.classList.remove('fa-pause');
    icon.classList.add('fa-play');
}

function updateMusicTitle(title) {
    const titleElements = document.querySelectorAll('#musicTitle');
    titleElements.forEach(el => el.textContent = title);
}

// Acciones de resultados
function retakeQuiz() {
    appState.answers = new Array(appState.questions.length).fill(null);
    appState.currentQuestion = 0;
    showStep(4);
    startQuiz();
}

function newQuiz() {
    appState = {
        apiKey: appState.apiKey,
        model: appState.model,
        content: '',
        files: [],
        quizType: '',
        questions: [],
        currentQuestion: 0,
        answers: [],
        startTime: null,
        endTime: null,
        isQuizActive: false
    };
    
    // Limpiar formularios
    document.getElementById('textContent').value = '';
    document.getElementById('pdfFile').value = '';
    document.getElementById('pdfPreview').classList.remove('show');
    document.getElementById('fileCount').textContent = '0';
    updateFileCounter(0);
    document.querySelectorAll('.quiz-type').forEach(qt => qt.classList.remove('selected'));
    
    showStep(2);
}

// Utilidades
function showStep(stepNumber) {
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById(`step${stepNumber}`).classList.add('active');
}

function showError(message) {
    alert(message); // Simplificado - en producción usar un modal personalizado
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

// ========================
// THEME TOGGLE FUNCTIONALITY
// ========================

// Función para inicializar el tema
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('i');
    
    // Aplicar tema guardado
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Actualizar icono
    if (savedTheme === 'dark') {
        themeIcon.className = 'fas fa-sun';
        themeToggle.title = 'Cambiar a modo claro';
    } else {
        themeIcon.className = 'fas fa-moon';
        themeToggle.title = 'Cambiar a modo oscuro';
    }
}

// Función para alternar tema
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('i');
    
    // Aplicar nuevo tema
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Guardar en localStorage
    localStorage.setItem('theme', newTheme);
    
    // Actualizar icono con animación
    themeIcon.style.transform = 'rotate(180deg)';
    
    setTimeout(() => {
        if (newTheme === 'dark') {
            themeIcon.className = 'fas fa-sun';
            themeToggle.title = 'Cambiar a modo claro';
        } else {
            themeIcon.className = 'fas fa-moon';
            themeToggle.title = 'Cambiar a modo oscuro';
        }
        themeIcon.style.transform = 'rotate(0deg)';
    }, 150);
}

// Inicializar tema al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        initializeTheme();
    }
});
