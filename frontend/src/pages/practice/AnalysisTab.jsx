import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Markdown from 'react-markdown'
import WordIpaRow from './WordIpaRow'

export default function AnalysisTab({ selectedSentence, words, activeWordIndex, analysis, analyzing, onAnalyze }) {
  const { t } = useTranslation()
  return (
    <>
      <div className="mb-4">
        {selectedSentence ? (
          <WordIpaRow words={words} activeIndex={activeWordIndex} />
        ) : (
          <p className="text-sm text-muted-foreground/50">{t('practice.selectSentence')}</p>
        )}
      </div>
      {selectedSentence && (
        <div className="border-t border-border/20 pt-4">
          {analysis ? (
            <div className="text-sm text-foreground/80 [&_h1]:mb-1 [&_h1]:mt-4 [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-foreground [&_h2]:mb-1 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:my-0.5 [&_p]:my-1 [&_p]:leading-relaxed [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4">
              <Markdown>{analysis}</Markdown>
            </div>
          ) : (
            <Button variant="outline" size="sm" disabled={analyzing} onClick={onAnalyze} className="gap-1.5">
              {analyzing && <Loader2 className="size-3.5 animate-spin" />}
              {t('practice.analyzeSentence')}
            </Button>
          )}
        </div>
      )}
    </>
  )
}
