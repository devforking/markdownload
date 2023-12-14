function addLatexToMathJax3()
{
  if (typeof(MathJax) === 'undefined' || !MathJax?.startup?.document?.math)
    return

  for (math of MathJax.startup.document.math)
  {
    math.typesetRoot.setAttribute("markdownload-latex", math.math)
  }
}
addLatexToMathJax3()
