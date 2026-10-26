export function _preparaCaracRaciais(sheetData, updatePers) {
    if (!sheetData.options.editable) return;
    const actorData = sheetData.document;
    const racas = actorData.items.filter(item => item.type == "Raca");
    if (racas.length > 1) {
        let ids = [];
        racas.slice(1).forEach(function (item) {
            ids.push(item.id);
        });
        actorData.deleteEmbeddedDocuments("Item", ids);  
    }
    const racaP = racas[0];
    if (racaP) {
        const racaData = racaP.system;
        if (actorData.system.raca != racaP.name)
        {
            updatePers['system.raca'] = racaP.name;
            updatePers['system.mod_racial.INT'] = racaData.mod_racial.INT;
            updatePers['system.mod_racial.AUR'] = racaData.mod_racial.AUR;
            updatePers['system.mod_racial.CAR'] = racaData.mod_racial.CAR;
            updatePers['system.mod_racial.FOR'] = racaData.mod_racial.FOR;
            updatePers['system.mod_racial.FIS'] = racaData.mod_racial.FIS;
            updatePers['system.mod_racial.AGI'] = racaData.mod_racial.AGI;
            updatePers['system.mod_racial.PER'] = racaData.mod_racial.PER;
        } 
    }
}

export function _caracSort(data, updatePers) {
    if (!data.options.editable) return;
    const actorData = data.document.system;
    const sort_INT = actorData.carac_sort.INT;
    const sort_AUR = actorData.carac_sort.AUR;
    const sort_CAR = actorData.carac_sort.CAR;
    const sort_FIS = actorData.carac_sort.FIS;
    const sort_FOR = actorData.carac_sort.FOR;
    const sort_AGI = actorData.carac_sort.AGI;
    const sort_PER = actorData.carac_sort.PER;
    let final_INT = sort_INT + actorData.mod_racial.INT;
    let final_AUR = sort_AUR + actorData.mod_racial.AUR;
    let final_CAR = sort_CAR + actorData.mod_racial.CAR;
    let final_FIS = sort_FIS + actorData.mod_racial.FIS;
    let final_FOR = sort_FOR + actorData.mod_racial.FOR;
    let final_AGI = sort_AGI + actorData.mod_racial.AGI;
    let final_PER = sort_PER + actorData.mod_racial.PER;
    const final_actor = data.document.system.carac_final;
    if (final_INT != final_actor.INT || final_AUR != final_actor.AUR || final_CAR != final_actor.CAR || final_FIS != final_actor.FIS || final_FOR != final_actor.FOR || final_AGI != final_actor.AGI || final_PER != final_actor.PER) {
        updatePers['system.carac_final.AGI'] = final_AGI;
        updatePers['system.carac_final.AUR'] = final_AUR;
        updatePers['system.carac_final.CAR'] = final_CAR;
        updatePers['system.carac_final.FIS'] = final_FIS;
        updatePers['system.carac_final.FOR'] = final_FOR;
        updatePers['system.carac_final.INT'] = final_INT;
        updatePers['system.carac_final.PER'] = final_PER;
    }
}

export function _calculaAjuste(sheetData, updatePers) {
    if (!sheetData.options.editable) return;
    const actorData = sheetData.document.system;
    let carac_finalINT = actorData.carac_final.INT;
    let carac_finalAUR = actorData.carac_final.AUR;
    let carac_finalCAR = actorData.carac_final.CAR;
    let carac_finalFOR = actorData.carac_final.FOR;
    let carac_finalFIS = actorData.carac_final.FIS;
    let carac_finalAGI = actorData.carac_final.AGI;
    let carac_finalPER = actorData.carac_final.PER;
    if (carac_finalINT > 36) carac_finalINT = 36;
    if (carac_finalAUR > 36) carac_finalAUR = 36;
    if (carac_finalCAR > 36) carac_finalCAR = 36;
    if (carac_finalFOR > 36) carac_finalFOR = 36;
    if (carac_finalFIS > 36) carac_finalFIS = 36;
    if (carac_finalAGI > 36) carac_finalAGI = 36;
    if (carac_finalPER > 36) carac_finalPER = 36;
    if (carac_finalINT < 0) carac_finalINT = 0;
    if (carac_finalAUR < 0) carac_finalAUR = 0;
    if (carac_finalCAR < 0) carac_finalCAR = 0;
    if (carac_finalFOR < 0) carac_finalFOR = 0;
    if (carac_finalFIS < 0) carac_finalFIS = 0;
    if (carac_finalAGI < 0) carac_finalAGI = 0;
    if (carac_finalPER < 0) carac_finalPER = 0;
    let valores = [0,-2,-2,-2,-1,-1,-1,-1,-1,0,0,0,0,1,1,1,2,2,3,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
    let somaINT = valores[carac_finalINT];
    let somaAUR = valores[carac_finalAUR];
    let somaCAR = valores[carac_finalCAR];
    let somaFOR = valores[carac_finalFOR];
    let somaFIS = valores[carac_finalFIS];
    let somaAGI = valores[carac_finalAGI];
    let somaPER = valores[carac_finalPER];
    const efeitos = sheetData.document.items.filter(e => e.type == "Efeito" && ((e.system.atributo == "INT" || e.system.atributo == "AUR" || e.system.atributo == "CAR" || e.system.atributo == "FOR" || e.system.atributo == "FIS" || e.system.atributo == "AGI" || e.system.atributo == "PER") && e.system.ativo));
    efeitos.forEach(function (efeit) {
        let efeito = efeit.system;
        if (efeito.atributo == "INT") {
            if (efeito.tipo == "+") {
                somaINT += efeito.valor;
            } else if (efeito.tipo == "-") {
                somaINT -= efeito.valor;
            } else if (efeito.tipo == "*") {
                somaINT = somaINT * efeito.valor;
            } else if (efeito.tipo == "/") {
                somaINT = somaINT / efeito.valor;
            }
        } else if (efeito.atributo == "AUR") {
            if (efeito.tipo == "+") {
                somaAUR += efeito.valor;
            } else if (efeito.tipo == "-") {
                somaAUR -= efeito.valor;
            } else if (efeito.tipo == "*") {
                somaAUR = somaAUR * efeito.valor;
            } else if (efeito.tipo == "/") {
                somaAUR = somaAUR / efeito.valor;
            }
        } else if (efeito.atributo == "CAR") {
            if (efeito.tipo == "+") {
                somaCAR += efeito.valor;
            } else if (efeito.tipo == "-") {
                somaCAR -= efeito.valor;
            } else if (efeito.tipo == "*") {
                somaCAR = somaCAR * efeito.valor;
            } else if (efeito.tipo == "/") {
                somaCAR = somaCAR / efeito.valor;
            }
        } else if (efeito.atributo == "FOR") {
            if (efeito.tipo == "+") {
                somaFOR += efeito.valor;
            } else if (efeito.tipo == "-") {
                somaFOR -= efeito.valor;
            } else if (efeito.tipo == "*") {
                somaFOR = somaFOR * efeito.valor;
            } else if (efeito.tipo == "/") {
                somaFOR = somaFOR / efeito.valor;
            }
        } else if (efeito.atributo == "FIS") {
            if (efeito.tipo == "+") {
                somaFIS += efeito.valor;
            } else if (efeito.tipo == "-") {
                somaFIS -= efeito.valor;
            } else if (efeito.tipo == "*") {
                somaFIS = somaFIS * efeito.valor;
            } else if (efeito.tipo == "/") {
                somaFIS = somaFIS / efeito.valor;
            }
        } else if (efeito.atributo == "AGI") {
            if (efeito.tipo == "+") {
                somaAGI += efeito.valor;
            } else if (efeito.tipo == "-") {
                somaAGI -= efeito.valor;
            } else if (efeito.tipo == "*") {
                somaAGI = somaAGI * efeito.valor;
            } else if (efeito.tipo == "/") {
                somaAGI = somaAGI / efeito.valor;
            }
        } else if (efeito.atributo == "PER") {
            if (efeito.tipo == "+") {
                somaPER += efeito.valor;
            } else if (efeito.tipo == "-") {
                somaPER -= efeito.valor;
            } else if (efeito.tipo == "*") {
                somaPER = somaPER * efeito.valor;
            } else if (efeito.tipo == "/") {
                somaPER = somaPER / efeito.valor;
            }
        }
    });
    if (actorData.atributos.INT != somaINT) {
        updatePers["system.atributos.INT"] = somaINT;
    }
    if (actorData.atributos.AUR != somaAUR) {
        updatePers["system.atributos.AUR"] = somaAUR;
    }
    if (actorData.atributos.CAR != somaCAR) {
        updatePers["system.atributos.CAR"] = somaCAR;
    }  
    if (actorData.atributos.FOR != somaFOR) {
        updatePers["system.atributos.FOR"] = somaFOR;
    }  
    if (actorData.atributos.FIS != somaFIS) {
        updatePers["system.atributos.FIS"] = somaFIS;
    } 
    if (actorData.atributos.AGI != somaAGI) {
        updatePers["system.atributos.AGI"] = somaAGI;
    } 
    if (actorData.atributos.PER != somaPER) {
        updatePers["system.atributos.PER"] = somaPER;
    } 
    return {base: valores[carac_finalFIS], efetivo: somaFIS};
}

const ATRIBUTOS_BASICOS = ["INT", "AUR", "CAR", "FOR", "FIS", "AGI", "PER"];

function _formataNumeroEfeito(valor) {
    const arredondado = Math.round(valor * 100) / 100;
    return Number.isInteger(arredondado) ? String(arredondado) : String(arredondado).replace(".", ",");
}

export function _preparaEfeitosAtributos(sheetData) {
    const actorData = sheetData.document;
    const atributos = actorData.system.atributos;
    const efeitosAtivos = actorData.items.filter(item =>
        item.type == "Efeito"
        && item.system.ativo
        && ATRIBUTOS_BASICOS.includes(item.system.atributo)
    );
    const detalhes = {};
    const efetivos = {};

    ATRIBUTOS_BASICOS.forEach(atributo => {
        const base = Number(atributos[atributo]) || 0;
        let efetivo = base;
        const origens = [];

        efeitosAtivos
            .filter(item => item.system.atributo == atributo)
            .forEach(item => {
                const valor = Number(item.system.valor);
                if (!Number.isFinite(valor)) return;

                const operador = item.system.tipo;
                if (operador == "+") efetivo += valor;
                else if (operador == "-") efetivo -= valor;
                else if (operador == "*") efetivo *= valor;
                else if (operador == "/" && valor != 0) efetivo /= valor;
                else return;

                const simbolo = operador == "*" ? "×" : operador == "/" ? "÷" : operador;
                origens.push(`${item.name}: ${simbolo}${_formataNumeroEfeito(valor)}`);
            });

        const modificador = efetivo - base;
        const temEfeito = origens.length > 0;
        detalhes[atributo] = {
            exibicao: temEfeito
                ? `${modificador > 0 ? "+" : ""}${_formataNumeroEfeito(modificador)}`
                : "—",
            classe: modificador > 0
                ? "efeito-atributo-positivo"
                : modificador < 0
                    ? "efeito-atributo-negativo"
                    : "efeito-atributo-neutro",
            descricao: temEfeito ? origens.join(" • ") : "Nenhum efeito ativo.",
            valor: modificador,
            efetivo
        };
        efetivos[atributo] = efetivo;
    });

    return {detalhes, efetivos};
}

export function _prepareValorTeste(sheetData, updatePers, atributosEfetivos = null){
    if (!sheetData.options.editable) return;
    const actorData = sheetData.document.system;
    if (atributosEfetivos) {
        ATRIBUTOS_BASICOS.forEach(atributo => {
            const valorTeste = atributosEfetivos[atributo] * 4;
            if (actorData.valor_teste[atributo] != valorTeste) {
                updatePers[`system.valor_teste.${atributo}`] = valorTeste;
            }
        });
        return;
    }
    if (actorData.valor_teste.INT != actorData.atributos.INT*4 || actorData.valor_teste.AUR != actorData.atributos.AUR*4 || actorData.valor_teste.CAR != actorData.atributos.CAR*4 || actorData.valor_teste.FOR != actorData.atributos.FOR*4 || actorData.valor_teste.FIS != actorData.atributos.FIS*4 || actorData.valor_teste.AGI != actorData.atributos.AGI*4 || actorData.valor_teste.PER != actorData.atributos.PER*4) {
        updatePers["system.valor_teste.INT"] = actorData.atributos.INT*4;
        updatePers["system.valor_teste.AUR"] = actorData.atributos.AUR*4;
        updatePers["system.valor_teste.CAR"] = actorData.atributos.CAR*4;
        updatePers["system.valor_teste.FOR"] = actorData.atributos.FOR*4;
        updatePers["system.valor_teste.FIS"] = actorData.atributos.FIS*4;
        updatePers["system.valor_teste.AGI"] = actorData.atributos.AGI*4;
        updatePers["system.valor_teste.PER"] = actorData.atributos.PER*4;
    }
    if (updatePers.hasOwnProperty("system.atributos.INT")) updatePers["system.valor_teste.INT"] = updatePers["system.atributos.INT"]*4;
    if (updatePers.hasOwnProperty("system.atributos.AUR")) updatePers["system.valor_teste.AUR"] = updatePers["system.atributos.AUR"]*4;
    if (updatePers.hasOwnProperty("system.atributos.CAR")) updatePers["system.valor_teste.CAR"] = updatePers["system.atributos.CAR"]*4;
    if (updatePers.hasOwnProperty("system.atributos.FOR")) updatePers["system.valor_teste.FOR"] = updatePers["system.atributos.FOR"]*4;
    if (updatePers.hasOwnProperty("system.atributos.FIS")) updatePers["system.valor_teste.FIS"] = updatePers["system.atributos.FIS"]*4;
    if (updatePers.hasOwnProperty("system.atributos.AGI")) updatePers["system.valor_teste.AGI"] = updatePers["system.atributos.AGI"]*4;
    if (updatePers.hasOwnProperty("system.atributos.PER")) updatePers["system.valor_teste.PER"] = updatePers["system.atributos.PER"]*4;
    
}

export function _attProfissao(sheetData, updatePers, items_toUpdate, atributosEfetivos = null) {
    if (!sheetData.options.editable) return;
    const actorData = sheetData.document;
    const actorSheetData = sheetData.document.system;
    const profissoes = actorData.items.filter(item => item.type == "Profissao");
    if (profissoes.length > 1) {
        let ids = [];
        profissoes.slice(1).forEach(function (item) {
            ids.push(item.id);
        });
        actorData.deleteEmbeddedDocuments("Item", ids);
    }
    const profissaoP = profissoes[0];
    if (profissaoP) {
        const profissaoData = profissaoP.system;
        const max_hab = profissaoData.p_aquisicao.p_hab + Math.floor(actorSheetData.estagio / 2);
        const atrib_magia = profissaoData.atrib_mag;
        let pontos_hab = profissaoData.p_aquisicao.p_hab * actorSheetData.estagio;
        const grupo_pen = profissaoData.grupo_pen;
        const hab_nata = actorSheetData.hab_nata;
        let pontos_tec = profissaoData.p_aquisicao.p_tec * actorSheetData.estagio;
        let pontos_mag = 0;
        let pontos_gra = profissaoData.p_aquisicao.p_gra * actorSheetData.estagio;
        let intel = actorSheetData.atributos.INT;
        let aura = actorSheetData.atributos.AUR;
        let cari = actorSheetData.atributos.CAR;
        let forca = actorSheetData.atributos.FOR;
        let fisico = actorSheetData.atributos.FIS;
        let agilid = actorSheetData.atributos.AGI;
        let peric = actorSheetData.atributos.PER;
        if (updatePers.hasOwnProperty("system.atributos.INT")) intel = updatePers['system.atributos.INT'];
        if (updatePers.hasOwnProperty("system.atributos.AUR")) aura = updatePers['system.atributos.AUR'];
        if (updatePers.hasOwnProperty("system.atributos.CAR")) cari = updatePers['system.atributos.CAR'];
        if (updatePers.hasOwnProperty("system.atributos.FOR")) forca = updatePers['system.atributos.FOR'];
        if (updatePers.hasOwnProperty("system.atributos.FIS")) fisico = updatePers['system.atributos.FIS'];
        if (updatePers.hasOwnProperty("system.atributos.AGI")) agilid = updatePers['system.atributos.AGI'];
        if (updatePers.hasOwnProperty("system.atributos.PER")) peric = updatePers['system.atributos.PER'];
        if (max_hab != actorSheetData.max_hab) {
            updatePers["system.max_hab"] = max_hab;
        }
        if (atrib_magia != "") {
            if (atrib_magia == "INT") pontos_mag = ((2 * intel) + 7) * actorSheetData.estagio;
            else if (atrib_magia == "AUR") pontos_mag = ((2 * aura) + 7) * actorSheetData.estagio;
            else if (atrib_magia == "CAR") pontos_mag = ((2 * cari) + 7) * actorSheetData.estagio;
            else if (atrib_magia == "FOR") pontos_mag = ((2 * forca) + 7) * actorSheetData.estagio;
            else if (atrib_magia == "FIS") pontos_mag = ((2 * fisico) + 7)  * actorSheetData.estagio;
            else if (atrib_magia == "AGI") pontos_mag = ((2 * agilid) + 7) * actorSheetData.estagio;
            else if (atrib_magia == "PER") pontos_mag = ((2 * peric) + 7) * actorSheetData.estagio;
        } else pontos_mag = 0;
        const efeitos = sheetData.document.items.filter(e => e.type == "Efeito" && ((e.system.atributo == "PHAB" || e.system.atributo == "PTEC" || e.system.atributo == "PARM" || e.system.atributo == "PMAG") && e.system.ativo));
        efeitos.forEach(function(efeit) {
            let efeito = efeit.system;
            if (efeito.atributo == "PHAB") {
                if (efeito.tipo == "+") {
                    pontos_hab += efeito.valor;
                } else if (efeito.tipo == "-") {
                    pontos_hab -= efeito.valor;
                } else if (efeito.tipo == "*") {
                    pontos_hab = pontos_hab * efeito.valor;
                } else if (efeito.tipo == "/") {
                    pontos_hab = pontos_hab / efeito.valor;
                }
            } else if (efeito.atributo == "PTEC") {
                if (efeito.tipo == "+") {
                    pontos_tec += efeito.valor;
                } else if (efeito.tipo == "-") {
                    pontos_tec -= efeito.valor;
                } else if (efeito.tipo == "*") {
                    pontos_tec = pontos_tec * efeito.valor;
                } else if (efeito.tipo == "/") {
                    pontos_tec = pontos_tec / efeito.valor;
                }
            } else if (efeito.atributo == "PARM") {
                if (efeito.tipo == "+") {
                    pontos_gra += efeito.valor;
                } else if (efeito.tipo == "-") {
                    pontos_gra -= efeito.valor;
                } else if (efeito.tipo == "*") {
                    pontos_gra = pontos_gra * efeito.valor;
                } else if (efeito.tipo == "/") {
                    pontos_gra = pontos_gra / efeito.valor;
                }
            } else if (efeito.atributo == "PMAG") {
                if (efeito.tipo == "+") {
                    pontos_mag += efeito.valor;
                } else if (efeito.tipo == "-") {
                    pontos_mag -= efeito.valor;
                } else if (efeito.tipo == "*") {
                    pontos_mag = pontos_mag * efeito.valor;
                } else if (efeito.tipo == "/") {
                    pontos_mag = pontos_mag / efeito.valor;
                }
            }
        });
        if (pontos_gra > 0) {
            pontos_gra -= actorSheetData.grupos.CD;
            pontos_gra -= actorSheetData.grupos.CI;
            pontos_gra -= actorSheetData.grupos.CL;
            pontos_gra -= actorSheetData.grupos.CLD;
            pontos_gra -= actorSheetData.grupos.EL;
            pontos_gra -= actorSheetData.grupos.CmE * 2;
            pontos_gra -= actorSheetData.grupos.CmM * 2;
            pontos_gra -= actorSheetData.grupos.EM * 2;
            pontos_gra -= actorSheetData.grupos.PmA * 2;
            pontos_gra -= actorSheetData.grupos.PmL * 2;
            pontos_gra -= actorSheetData.grupos.CpE * 3;
            pontos_gra -= actorSheetData.grupos.CpM * 3;
            pontos_gra -= actorSheetData.grupos.EP * 3;
            pontos_gra -= actorSheetData.grupos.PP * 3;
            pontos_gra -= actorSheetData.grupos.PpA * 3;
            pontos_gra -= actorSheetData.grupos.PpB * 3;
            if (actorSheetData.grupo_aprim != "") {
                pontos_gra -= actorSheetData.grupos[actorSheetData.grupo_aprim] * 2;
            }
        }
        let tecnicasP = actorData.items.filter(item => item.type == "Tecnica_Combate");
        tecnicasP.forEach(function (tecnica) {
            pontos_tec -= tecnica.system.custo * tecnica.system.nivel;
        });
        let magiasP = actorData.items.filter(item => item.type == "Magia");
        magiasP.forEach(function (magia) {
            pontos_mag -= magia.system.custo * magia.system.nivel;
        });
        //let hab_updates = [];
        let habilidadesP = actorData.items.filter(item => item.type == "Habilidade");
        habilidadesP.forEach(function (habilidade) {
            let hab_nataD = false;
            if (habilidade.system.tipo == grupo_pen) {
                pontos_hab -= (habilidade.system.custo + 1) * habilidade.system.nivel;
            } else if (habilidade.name == hab_nata) {
                hab_nataD = true;
            } else {
                pontos_hab -= habilidade.system.custo * habilidade.system.nivel;
            }
            let hab = habilidade;
            const atributo = hab.system.ajuste.atributo;
            let hab_nivel = 0;
            let hab_penal = 0;
            let hab_bonus = 0;
            if (hab.system.nivel) hab_nivel = hab.system.nivel;
            if (hab.system.penalidade) hab_penal = hab.system.penalidade;
            if (hab.system.bonus) hab_bonus = hab.system.bonus;
            if (hab_nataD) hab_nivel = actorSheetData.estagio;
            let valor_atrib = 0;
            if (atributo == "INT") valor_atrib = intel;
            else if (atributo == "AUR") valor_atrib = aura;
            else if (atributo == "CAR") valor_atrib = cari;
            else if (atributo == "FOR") valor_atrib = forca;
            else if (atributo == "FIS") valor_atrib = fisico;
            else if (atributo == "AGI") valor_atrib = agilid;
            else if (atributo == "PER") valor_atrib = peric;
            // Efeitos alteram o total da habilidade, não os pontos de aquisição.
            if (atributosEfetivos && ATRIBUTOS_BASICOS.includes(atributo)) {
                valor_atrib = atributosEfetivos[atributo];
            }
            let total = 0;
            if (hab_nivel > 0) {
                total = parseInt(valor_atrib) + parseInt(hab_nivel) + parseInt(hab_penal) + parseInt(hab_bonus);
            } else {
                total = -7;
            }
            if (hab.system.ajuste.valor != valor_atrib || hab.system.total != total) {
                if (hab_nataD) {
                    items_toUpdate.push({
                        "_id": hab._id,
                        "system.ajuste.valor": valor_atrib,
                        "system.total": total,
                        "system.nivel": actorSheetData.estagio
                    }); 
                } else {
                    items_toUpdate.push({
                        "_id": hab._id,
                        "system.ajuste.valor": valor_atrib,
                        "system.total": total
                    });
                }
            }

        });
        if (pontos_hab != actorSheetData.pontos_aqui) {
            updatePers["system.pontos_aqui"] = pontos_hab;
        }
        if (pontos_tec != actorSheetData.pontos_tec) {
            updatePers["system.pontos_tec"] = pontos_tec;
        }
        if (pontos_gra != actorSheetData.pontos_comb) {
            updatePers["system.pontos_comb"] = pontos_gra;
        }
        if (pontos_mag != actorSheetData.pontos_mag) {
            updatePers["system.pontos_mag"] = pontos_mag;
        }
        if  (profissaoP.name != actorSheetData.profissao) {
            updatePers["system.profissao"] = profissaoP.name;
        }
    }
}

export function _attCargaAbsorcaoDefesa(data, updatePers, atributosEfetivos = null) {
    if (!data.options.editable) return;
    const actorSheet = data.document;
    var actor_carga = 0;    // Atualiza Carga e verifica Sobrecarga
    var cap_transp = 0;
    var cap_usada = 0;
    var absorcao = 0;
    var def_pasVal = 0;
    var def_pasCat = "";
    var abs_magica = 0;
    
    if (actorSheet.defesas.length > 0){
        actorSheet.defesas.forEach(function(item){
            let itemData = item;
            //actor_carga += item.system.peso;
            if (itemData.system.equipado) absorcao += itemData.system.absorcao;
            if (itemData.system.equipado)  def_pasVal += itemData.system.defesa_base.valor;
            if (itemData.system.defesa_base.tipo != ""){
                if (!itemData.system.equipado) def_pasCat = "L";
                else def_pasCat = itemData.system.defesa_base.tipo;
            }
            abs_magica += itemData.system.peso;
        });
    }
    if (actorSheet.pertences.length > 0){
        actorSheet.pertences.forEach(function(item){
            let itemData = item;
            actor_carga += itemData.system.peso * itemData.system.quant;
        });
    }
    if (actorSheet.transportes.length > 0){
        actorSheet.transportes.forEach(function(item){
            let itemData = item;
            cap_transp += itemData.system.capacidade.carga;
        });
    }
    if (actorSheet.pertences_transporte.length > 0){
        actorSheet.pertences_transporte.forEach(function(item){
            let itemData = item;
            cap_usada += itemData.system.peso * itemData.system.quant;
        });
    }
    let agilidade = atributosEfetivos?.AGI ?? data.document.system.atributos.AGI;
    if (!atributosEfetivos && updatePers.hasOwnProperty('system.atributos.AGI')) agilidade = updatePers['system.atributos.AGI'];
    var def_atiVal = def_pasVal + agilidade;
    const efeitos = data.document.items.filter(e => e.type == "Efeito" && ((e.system.atributo == "DEF" || e.system.atributo == "ABS") && e.system.ativo));
    efeitos.forEach(function (efeit){
        let efeito = efeit.system;
        if (efeito.atributo == "DEF") {
            if (efeito.tipo == "+") {
                def_pasVal += efeito.valor;
                def_atiVal += efeito.valor;
            } else if (efeito.tipo == "-") {
                def_pasVal -= efeito.valor;
                def_atiVal -= efeito.valor;
            } else if (efeito.tipo == "*") {
                def_pasVal = def_pasVal * efeito.valor;
                def_atiVal = def_atiVal * efeito.valor;
            } else if (efeito.tipo == "/") {
                def_pasVal = def_pasVal / efeito.valor;
                def_atiVal = def_atiVal / efeito.valor;
            }
        } else if (efeito.atributo == "ABS") {
            if (efeito.tipo == "+") {
                absorcao += efeito.valor;
            } else if (efeito.tipo == "-") {
                absorcao -= efeito.valor;
            } else if (efeito.tipo == "*") {
                absorcao = absorcao * efeito.valor;
            } else if (efeito.tipo == "/") {
                absorcao = absorcao / efeito.valor;
            }
        }
    });
    const actorData = data.document.system;
    const actorSheetData = actorSheet.system;
    if (abs_magica > 0) abs_magica = 1;
    if (def_pasCat == "") def_pasCat = "L";
    if (actorData.d_passiva.valor != def_pasVal || actorData.d_passiva.categoria != def_pasCat || actorData.d_ativa.categoria != def_pasCat || actorData.d_ativa.valor != def_atiVal || actorData.carga_transp.value != cap_usada || actorData.carga_transp.max != cap_transp || actorData.carga.value != actor_carga || actorData.absorcao.max != absorcao || actorData.v_base != abs_magica) {
        updatePers["system.d_passiva.valor"] = def_pasVal;
        updatePers["system.d_passiva.categoria"] = def_pasCat;
        updatePers["system.d_ativa.categoria"] = def_pasCat;
        updatePers["system.d_ativa.valor"] = def_atiVal;
        updatePers["system.carga_transp.value"] = cap_usada;
        updatePers["system.carga_transp.max"] = cap_transp;
        updatePers["system.carga.value"] = actor_carga;
        updatePers["system.absorcao.max"] = absorcao;
        updatePers['system.v_base'] = abs_magica;
    }
    if (cap_transp > 0 && cap_usada < cap_transp) {
        if (!actorData.carga_transp.hasTransp) {
            updatePers["system.carga_transp.hasTransp"] = true;
        }
    } else {
        if (actorData.carga_transp.hasTransp) {
            updatePers["system.carga_transp.hasTransp"] = false;
        }
    }
    let carga_max = 0;
    let forca = atributosEfetivos?.FOR ?? actorSheetData.atributos.FOR;
    if (!atributosEfetivos && updatePers.hasOwnProperty('system.atributos.FOR')) forca = updatePers['system.atributos.FOR'];
    if (forca >= 1) {
        carga_max = (forca * 20) + 20;
        if (actorSheetData.carga.value > carga_max) {
            if (!actorData.carga.sobrecarga || actorData.carga.valor_s != actorSheetData.carga.value - carga_max) {
                updatePers["system.carga.sobrecarga"] = true;
                updatePers["system.carga.valor_s"] = actorSheetData.carga.value - carga_max;
            }
        } else {
            if (actorData.carga.sobrecarga || actorData.carga.valor_s != 0) {
                updatePers["system.carga.sobrecarga"] = false;
                updatePers["system.carga.valor_s"] = 0;
            }
        }
    } else {
        carga_max = 20;
        if (actorSheetData.carga.value > carga_max) {
            if (!actorData.carga.sobrecarga || actorData.carga.valor_s != actorSheetData.carga.value - carga_max) {
                updatePers["system.carga.sobrecarga"] = true;
                updatePers["system.carga.valor_s"] = actorSheetData.carga.value - carga_max;
            }
        } else {
            if (actorData.carga.sobrecarga || actorData.carga.valor_s != 0) {
                updatePers["system.carga.sobrecarga"] = false;
                updatePers["system.carga.valor_s"] = 0;
            }
        }
    }
    if (actorData.carga.max != carga_max) {
        updatePers["system.carga.max"] = carga_max;
    }
}

// O modificador aplicado é salvo junto da EH para que reabrir a ficha não o some novamente.
export function _calculaEhTemporaria(actor, fisico, estagio = actor.system.estagio, maximoBase = null) {
    const eh = actor.system.eh;
    const anterior = Number(eh.bonusFis ?? 0);
    const base = maximoBase ?? (Number(eh.max) - anterior);
    const solicitado = (Number(fisico.efetivo) - Number(fisico.base)) * Number(estagio);
    if (![anterior, base, solicitado, Number(eh.value)].every(Number.isFinite)) {
        throw new Error("Não foi possível calcular a EH temporária. Verifique EH, Físico e estágio.");
    }
    const maximo = Math.max(0, base + solicitado);
    const bonus = maximo - base;
    // Conserva a parcela abaixo de zero enquanto houver efeito, permitindo desfazer
    // penalidades sem recuperar EH que já estava gasta.
    const valorSemLimite = Number(eh.value) - Number(eh.deficitFis ?? 0) + bonus - anterior;
    return {
        "system.eh.max": maximo,
        "system.eh.value": Math.max(0, Math.min(maximo, valorSemLimite)),
        "system.eh.bonusFis": bonus,
        "system.eh.deficitFis": bonus === 0 ? 0 : Math.max(0, -valorSemLimite)
    };
}

export function _fisicoParaEh(data, sorteio = false) {
    if (sorteio) {
        if (!game.settings.get(game.system.id, "ajusteManual") &&
            data.document.items.some(item => item.type == "Raca")) {
            return _calculaAjuste(data, {});
        }
        const base = Number(data.document.system.atributos.FIS);
        return {base, efetivo: base};
    }
    return {
        base: Number(data.document.system.atributos.FIS),
        efetivo: _preparaEfeitosAtributos(data).efetivos.FIS
    };
}

export function _attEhTemporaria(data, updatePers, sorteio = false) {
    if (!data.options.editable) return;
    const actor = data.document;
    const fisico = _fisicoParaEh(data, sorteio);
    const profissao = actor.items.find(item => item.type == "Profissao");
    const temRaca = actor.items.some(item => item.type == "Raca");
    const baseInicial = Number(actor.system.estagio) === 1 && profissao && temRaca
        ? Number(profissao.system.eh_base) + fisico.base : null;
    const changes = _calculaEhTemporaria(actor, fisico, actor.system.estagio, baseInicial);
    for (const [key, value] of Object.entries(changes)) {
        const field = key.split(".")[2];
        if (Number(actor.system.eh[field] ?? 0) !== value) updatePers[key] = value;
    }
}

export function _attEfEhVB(data, updatePers, atributosEfetivos = null) {
    if (!data.options.editable) return;
    let ef_base = 0;
    let vb_base = 0;
    const racaP = data.document.items.filter(item => item.type == "Raca")[0];
    ef_base = racaP.system.ef_base;
    vb_base = racaP.system.vb;
    const fisicoBase = updatePers.hasOwnProperty('system.atributos.FIS')
        ? updatePers['system.atributos.FIS']
        : data.document.system.atributos.FIS;
    let forca = atributosEfetivos?.FOR ?? data.document.system.atributos.FOR;
    let fisico = atributosEfetivos?.FIS ?? fisicoBase;
    if (!atributosEfetivos && updatePers.hasOwnProperty("system.atributos.FOR")) forca = updatePers['system.atributos.FOR'];
    let efMax = forca + fisico + ef_base;
    let vbTotal = fisico + vb_base;
    const efeitos = data.document.items.filter(e => e.type == "Efeito" && ((e.system.atributo == "VB" || e.system.atributo == "EF") && e.system.ativo));
    efeitos.forEach(function (efeit) {
        let efeito = efeit.system;
        if (efeito.atributo == "VB") {
            if (efeito.tipo == "+") {
                vbTotal += efeito.valor;
            } else if (efeito.tipo == "-") {
                vbTotal -= efeito.valor;
            } else if (efeito.tipo == "*") {
                vbTotal = vbTotal * efeito.valor;
            } else if (efeito.tipo == "/") {
                vbTotal = vbTotal / efeito.valor;
            }
        } else if (efeito.atributo == "EF") {
            if (efeito.tipo == "+") {
                efMax += efeito.valor;
            } else if (efeito.tipo == "-") {
                efMax -= efeito.valor;
            } else if (efeito.tipo == "*") {
                efMax = efMax * efeito.valor;
            } else if (efeito.tipo == "/") {
                efMax = efMax / efeito.valor;
            }
        }
    });
    if (data.document.system.ef.max != efMax || data.document.system.vb != vbTotal) {
        updatePers["system.ef.max"] = efMax;
        updatePers["system.vb"] = vbTotal
    }
    if (data.document.system.ef.value > efMax) {
        updatePers["system.ef.value"] = efMax;
    }
}

export function _attProximoEstag(data, updatePers) {
    if (!data.options.editable) return;
    const estagio_atual = Number(data.document.system.estagio);
    const prox_est = [0, 11, 21, 31, 46, 61, 76, 96, 116, 136, 166, 196, 226, 266, 306, 346, 386, 436, 486, 536, 586, 646, 706, 766, 826, 896, 966, 1036, 1106, 1186, 1266,
        1346, 1426, 1516, 1606, 1696, 1786, 1886, 1986, 2086];
    let proximoEstagio = prox_est[estagio_atual];
    if (estagio_atual >= 40) {
        proximoEstagio = 2186;
        for (let estagio = 41; estagio <= estagio_atual; estagio++) {
            const faixa = 40 + (Math.floor((estagio - 13) / 4) * 10);
            proximoEstagio += faixa;
        }
    }
    if (!Number.isFinite(proximoEstagio)) return;
    if (data.document.system.pontos_estagio.next != proximoEstagio) {
        updatePers["system.pontos_estagio.next"] = proximoEstagio;
    }
}

export function _attKarmaMax(data, updatePers, atributosEfetivos = null) {
    if (!data.options.editable) return;
    let aura = atributosEfetivos?.AUR ?? data.document.system.atributos.AUR;
    if (!atributosEfetivos && updatePers.hasOwnProperty('system.atributos.AUR')) aura = updatePers['system.atributos.AUR'];
    let karma = ((aura) + 1 ) * ((data.document.system.estagio) + 1);
    if (karma < 0) karma = 0;
    const profissoes = data.items.filter(item => item.type == "Profissao");
    const profissaoP = profissoes[0];
    if (profissaoP) {
        const profissaoData = profissaoP.system;
        const atrib_magia = profissaoData.atrib_mag;
        if (atrib_magia == "") karma = 0;
    }
    const efeitos = data.document.items.filter(e => e.type == "Efeito" && (e.system.atributo == "KMA" && e.system.ativo));
    efeitos.forEach(function(efeit) {
        let efeito = efeit.system;
        if (efeito.tipo == "+") {
            karma += efeito.valor;
        } else if (efeito.tipo == "-") {
            karma -= efeito.valor;
        } else if (efeito.tipo == "*") {
            karma = karma * efeito.valor;
        } else if (efeito.tipo == "/") {
            karma = karma / efeito.valor;
        }
    });
    if (data.document.system.karma.max != karma) {
        updatePers["system.karma.max"] = karma;
    }
    if (data.document.system.karma.value > karma) {
        updatePers["system.karma.value"] = karma;
    }
}

export function _attRM(data, updatePers, atributosEfetivos = null) {
    if (!data.options.editable) return;
    let aura = atributosEfetivos?.AUR ?? data.document.system.atributos.AUR;
    if (!atributosEfetivos && updatePers.hasOwnProperty('system.atributos.AUR')) aura = updatePers["system.atributos.AUR"];
    let rm = data.document.system.estagio + aura;
    const efeitos = data.document.items.filter(e => e.type == "Efeito" && (e.system.atributo == "RMAG" && e.system.ativo));
    efeitos.forEach(function(efeit) {
        let efeito = efeit.system;
        if (efeito.tipo == "+") {
            rm += efeito.valor;
        } else if (efeito.tipo == "-") {
            rm -= efeito.valor;
        } else if (efeito.tipo == "*") {
            rm = rm * efeito.valor;
        } else if (efeito.tipo == "/") {
            rm = rm / efeito.valor;
        }
    });
    if (data.document.system.rm != rm) {
        updatePers["system.rm"] = rm;
    }
}

export function _attRF(data, updatePers, atributosEfetivos = null) {
    if (!data.options.editable) return;
    let fisico = atributosEfetivos?.FIS ?? data.document.system.atributos.FIS;
    if (!atributosEfetivos && updatePers.hasOwnProperty('system.atributos.FIS')) fisico = updatePers['system.atributos.FIS'];
    let rf = data.document.system.estagio + fisico;
    const efeitos = data.document.items.filter(e => e.type == "Efeito" && (e.system.atributo == "RFIS" && e.system.ativo));
    efeitos.forEach(function(efeit) {
        let efeito = efeit.system;
        if (efeito.tipo == "+") {
            rf += efeito.valor;
        } else if (efeito.tipo == "-") {
            rf -= efeito.valor;
        } else if (efeito.tipo == "/") {
            rf = rf / efeito.valor;
        } else if (efeito.tipo == "*") {
            rf = rf * efeito.valor;
        }
    });
    if (data.document.system.rf != rf) {
        updatePers["system.rf"] = rf;
    } 
}

export function _updateHabilItems(sheetData, updateItemsNpc, atributosEfetivos = null) {
    if (!sheetData.options.editable) return;
    const actorData = sheetData.document.system;
    const atributos = atributosEfetivos ?? actorData.atributos;
    const habilidades = sheetData.document.items.filter(item => item.type == "Habilidade");
    for (let habilidade of habilidades) {
        let hab = habilidade;
        const atributo = hab.system.ajuste.atributo;
        let hab_nivel = 0;
        let hab_penal = 0;
        let hab_bonus = 0;
        if (hab.system.nivel) hab_nivel = hab.system.nivel;
        if (hab.system.penalidade) hab_penal = hab.system.penalidade;
        if (hab.system.bonus) hab_bonus = hab.system.bonus;
        let valor_atrib = 0;
        if (atributo == "INT") valor_atrib = atributos.INT;
        else if (atributo == "AUR") valor_atrib = atributos.AUR;
        else if (atributo == "CAR") valor_atrib = atributos.CAR;
        else if (atributo == "FOR") valor_atrib = atributos.FOR;
        else if (atributo == "FIS") valor_atrib = atributos.FIS;
        else if (atributo == "AGI") valor_atrib = atributos.AGI;
        else if (atributo == "PER") valor_atrib = atributos.PER;
        let total = 0;
        if (hab_nivel > 0) {
            total = parseInt(valor_atrib) + parseInt(hab_nivel) + parseInt(hab_penal) + parseInt(hab_bonus);
        } else {
            total = -7;
        }
        if (hab.system.ajuste.valor != valor_atrib || hab.system.total != total) {
            updateItemsNpc.push({
                "_id": hab._id,
                "system.ajuste.valor": valor_atrib,
                "system.total": total
            });
        }
    }
}

export function _updateTencnicasItems(sheetData, items_toUpdate, atributosEfetivos = null) {
    if (!sheetData.options.editable) return;
    const actorData = sheetData.document.system;
    const atributos = atributosEfetivos ?? actorData.atributos;
    const tecnicas = sheetData.document.items.filter(item => item.type == "Tecnica_Combate");
    //let update_tecnicas = [];
    tecnicas.forEach(function(tecnica) {
        let tec = tecnica.system;
        const ajusteTecnica = tec.ajuste;
        const nivel_tecnica = tec.nivel;
        let total = 0;
        if (ajusteTecnica.atributo == "INT") total = atributos.INT + nivel_tecnica;
        else if (ajusteTecnica.atributo == "CAR") total = atributos.CAR + nivel_tecnica;
        else if (ajusteTecnica.atributo == "AUR") total = atributos.AUR + nivel_tecnica;
        else if (ajusteTecnica.atributo == "FOR") total = atributos.FOR + nivel_tecnica;
        else if (ajusteTecnica.atributo == "FIS") total = atributos.FIS + nivel_tecnica;
        else if (ajusteTecnica.atributo == "AGI") total = atributos.AGI + nivel_tecnica;
        else if (ajusteTecnica.atributo == "PER") total = atributos.PER + nivel_tecnica;
        else total = nivel_tecnica;
        total += ajusteTecnica.valor;
        total += tec.bonus;
        if (tecnica.flags?.tagmarSync?.environmentalTechnique === true && Number(nivel_tecnica) <= 0) total = -7;
        if (tec.fa != total) {
            items_toUpdate.push({
                "_id": tecnica.id,
                "system.fa": total
            });
        }
    });

}

export function _updateMagiasItems(sheetData, items_toUpdate, atributosEfetivos = null) {
    if (!sheetData.options.editable) return;
    const actorData = sheetData.document.system;
    const atributos = atributosEfetivos ?? actorData.atributos;
    const magias = sheetData.document.items.filter(item => item.type == "Magia");
    //let update_magias = [];
    magias.forEach(function (magia) {
        let mag = magia.system;
        const aura = atributos.AUR;
        const m_nivel = mag.nivel;
        const m_karma = mag.total.valorKarma;
        let total = aura + m_nivel + m_karma;
        if (mag.total.valor != total) {
            items_toUpdate.push({
                "_id": magia.id,
                "system.total.valor": total
            });
        }
    });

}

export function _updateCombatItems(sheetData, items_toUpdate, atributosEfetivos = null) {
    if (!sheetData.options.editable) return;
    const actorData = sheetData.document.system;
    const atributos = atributosEfetivos ?? actorData.atributos;
    const combates = sheetData.document.items.filter(item => item.type == "Combate");
    //let comb_updates = [];
    combates.forEach(function (combs) {
        let comb = combs.system;
        let nivel_comb = 0;
        const bonus_magico = comb.bonus_magico;
        const bonus_danomais = comb.peso;
        const bonus_dano = comb.bonus_dano;
        const bonus = comb.bonus;
        let bonus_normal = 0;
        let bonus_valor = 0;
        if (bonus_dano == "AUR") bonus_valor = atributos.AUR;
        else if (bonus_dano == "FOR") bonus_valor = atributos.FOR;
        else if (bonus_dano == "AGI") bonus_valor = atributos.AGI;
        else if (bonus_dano == "PER") bonus_valor = atributos.PER;
        if (bonus == "AUR") bonus_normal = atributos.AUR;
        else if (bonus == "FOR") bonus_normal = atributos.FOR;
        else if (bonus == "AGI") bonus_normal = atributos.AGI;
        else if (bonus == "PER") bonus_normal = atributos.PER;
        const p_25 = comb.dano_base.d25;
        const p_50 = comb.dano_base.d50;
        const p_75 = comb.dano_base.d75;
        const p_100 = comb.dano_base.d100;
        const p_125 = comb.dano_base.d125;
        const p_150 = comb.dano_base.d150;
        const p_175 = comb.dano_base.d175;
        const p_200 = comb.dano_base.d200;
        const p_225 = comb.dano_base.d225;
        const p_250 = comb.dano_base.d250;
        const p_275 = comb.dano_base.d275;
        const p_300 = comb.dano_base.d300;
        if (comb.tipo == "CD") {
            nivel_comb = actorData.grupos.CD;
        }
        else if (comb.tipo == "CI") {
            nivel_comb = actorData.grupos.CI;
        }
        else if (comb.tipo == "CL") {
            nivel_comb = actorData.grupos.CL;
        }
        else if (comb.tipo == "CLD") {
            nivel_comb = actorData.grupos.CLD;
        }
        else if (comb.tipo == "EL") {
            nivel_comb = actorData.grupos.EL;
        }
        else if (comb.tipo == "CmE") {
            nivel_comb = actorData.grupos.CmE;
        }
        else if (comb.tipo == "CmM") {
            nivel_comb = actorData.grupos.CmM;
        }
        else if (comb.tipo == "EM") {
            nivel_comb = actorData.grupos.EM;
        }
        else if (comb.tipo == "PmA") {
            nivel_comb = actorData.grupos.PmA;
        }
        else if (comb.tipo == "PmL") {
            nivel_comb = actorData.grupos.PmL;
        }
        else if (comb.tipo == "CpE") {
            nivel_comb = actorData.grupos.CpE;
        }
        else if (comb.tipo == "CpM") {
            nivel_comb = actorData.grupos.CpM;
        }
        else if (comb.tipo == "EP") {
            nivel_comb = actorData.grupos.EP;
        }
        else if (comb.tipo == "PP") {
            nivel_comb = actorData.grupos.PP;
        }
        else if (comb.tipo == "PpA") {
            nivel_comb = actorData.grupos.PpA;
        }
        else if (comb.tipo == "PpB") {
            nivel_comb = actorData.grupos.PpB;
        }
        else if (comb.tipo == "") {
            nivel_comb = comb.nivel;
        } 
        else if (comb.tipo == "MAG") {
            nivel_comb = comb.nivel;
        }
        if (comb.nivel != nivel_comb || comb.dano.d25 != (p_25 + bonus_valor + bonus_danomais) || comb.custo != bonus_normal) {
            items_toUpdate.push({
                "_id": combs._id,
                "system.nivel": nivel_comb,
                "system.dano.d25": p_25 + bonus_valor + bonus_danomais,
                "system.dano.d50": p_50 + bonus_valor + bonus_danomais,
                "system.dano.d75": p_75 + bonus_valor + bonus_danomais,
                "system.dano.d100": p_100 + bonus_valor + bonus_danomais,
                "system.dano.d125": p_125 + bonus_valor + bonus_danomais,
                "system.dano.d150": p_150 + bonus_valor + bonus_danomais,
                "system.dano.d175": p_175 + bonus_valor + bonus_danomais,
                "system.dano.d200": p_200 + bonus_valor + bonus_danomais,
                "system.dano.d225": p_225 + bonus_valor + bonus_danomais,
                "system.dano.d250": p_250 + bonus_valor + bonus_danomais,
                "system.dano.d275": p_275 + bonus_valor + bonus_danomais,
                "system.dano.d300": p_300 + bonus_valor + bonus_danomais,
                "system.custo": bonus_normal
            });
        }
    });

}

export function _attDefesaNPC(data, updateNpc) {
    if (!data.options.editable) return;
    var absorcao = 0;
    var def_pasVal = 0;
    var def_pasCat = "";
    var abs_magica = 0;
    data.document.defesas.forEach(function(itemd){
        let item = itemd;
        absorcao += item.system.absorcao;
        def_pasVal += item.system.defesa_base.valor;
        if (item.system.defesa_base.tipo != ""){
            def_pasCat = item.system.defesa_base.tipo;
        }
        abs_magica += item.system.peso;
    });
    let agilidade = data.document.system.atributos.AGI;
    if (updateNpc.hasOwnProperty('system.atributos.AGI')) agilidade = updateNpc['system.atributos.AGI'];
    var def_atiVal = def_pasVal + agilidade;
    const actorData = data.document.system;
    if (abs_magica > 0) abs_magica = 1;
    if (actorData.d_passiva.valor != def_pasVal || actorData.d_passiva.categoria != def_pasCat || actorData.d_ativa.categoria != def_pasCat || actorData.d_ativa.valor != def_atiVal || actorData.absorcao.max != absorcao || actorData.v_base != abs_magica) {
        updateNpc["system.d_passiva.valor"] = def_pasVal;
        updateNpc["system.d_passiva.categoria"] = def_pasCat;
        updateNpc["system.d_ativa.categoria"] = def_pasCat;
        updateNpc["system.d_ativa.valor"] = def_atiVal;
        updateNpc["system.absorcao.max"] = absorcao;
        updateNpc['system.v_base'] = abs_magica;
    }
}

function somaPontos(atributo) {
    if (atributo <= -1) {
        return (atributo/2);
    } else if (atributo == 0) {
        return 0;
    } else if (atributo == 1) {
        return 1;
    } else if (atributo > 1) {
        return atributo + somaPontos(atributo - 1);
    }
}

export function _setPontosRaca(sheetData, updatePers){ // Função Apenas para ficha Alternativa
    if (!sheetData.options.editable) return;
    const actorData = sheetData.document.system;
    const raca = actorData.raca;
    const estagio = actorData.estagio;
    let pontos = 14;
    let g_int = 0;
    let g_aur = 0;
    let g_car = 0;
    let g_for = 0;
    let g_fis = 0;
    let g_agi = 0;
    let g_per = 0;
    if (raca === "Humano") pontos = 15;

    for (let x = 0; x <= estagio; x++) {
        if ((x % 2) != 0) pontos += 1;
    }

    if ((actorData.atributos.INT > actorData.mod_racial.INT) && (actorData.mod_racial.INT > 0)) { 
        pontos -= somaPontos(actorData.atributos.INT) - somaPontos(actorData.mod_racial.INT);
        g_int = somaPontos(actorData.atributos.INT) - somaPontos(actorData.mod_racial.INT);
    } else if ((actorData.atributos.INT > actorData.mod_racial.INT) && (actorData.mod_racial.INT < 0)) {
        pontos -= (somaPontos(actorData.atributos.INT) - actorData.mod_racial.INT);
        g_int = (somaPontos(actorData.atributos.INT) - actorData.mod_racial.INT);
    } else {
        pontos -= somaPontos(actorData.atributos.INT - actorData.mod_racial.INT);
        g_int = somaPontos(actorData.atributos.INT - actorData.mod_racial.INT);
    }

    if ((actorData.atributos.AUR > actorData.mod_racial.AUR) && (actorData.mod_racial.AUR > 0)) {
        pontos -= somaPontos(actorData.atributos.AUR) - somaPontos(actorData.mod_racial.AUR);
        g_aur = somaPontos(actorData.atributos.AUR) - somaPontos(actorData.mod_racial.AUR);
    } else if ((actorData.atributos.AUR > actorData.mod_racial.AUR) && (actorData.mod_racial.AUR < 0)) {
        pontos -= (somaPontos(actorData.atributos.AUR) - actorData.mod_racial.AUR);
        g_aur = (somaPontos(actorData.atributos.AUR) - actorData.mod_racial.AUR);
    } else {
        pontos -= somaPontos(actorData.atributos.AUR - actorData.mod_racial.AUR);
        g_aur = somaPontos(actorData.atributos.AUR - actorData.mod_racial.AUR);
    }

    if ((actorData.atributos.CAR > actorData.mod_racial.CAR) && (actorData.mod_racial.CAR > 0)) {
        pontos -= somaPontos(actorData.atributos.CAR) - somaPontos(actorData.mod_racial.CAR);
        g_car = somaPontos(actorData.atributos.CAR) - somaPontos(actorData.mod_racial.CAR);
    } else if ((actorData.atributos.CAR > actorData.mod_racial.CAR) && (actorData.mod_racial.CAR < 0)) {
        pontos -= (somaPontos(actorData.atributos.CAR) - actorData.mod_racial.CAR);
        g_car = (somaPontos(actorData.atributos.CAR) - actorData.mod_racial.CAR);
    } else {
        pontos -= somaPontos(actorData.atributos.CAR - actorData.mod_racial.CAR);
        g_car = somaPontos(actorData.atributos.CAR - actorData.mod_racial.CAR);
    }

    if ((actorData.atributos.FOR > actorData.mod_racial.FOR) && (actorData.mod_racial.FOR > 0)) {
        pontos -= somaPontos(actorData.atributos.FOR) - somaPontos(actorData.mod_racial.FOR);
        g_for = somaPontos(actorData.atributos.FOR) - somaPontos(actorData.mod_racial.FOR);
    } else if ((actorData.atributos.FOR > actorData.mod_racial.FOR) && (actorData.mod_racial.FOR < 0)) {
        pontos -= (somaPontos(actorData.atributos.FOR) - actorData.mod_racial.FOR);
        g_for = (somaPontos(actorData.atributos.FOR) - actorData.mod_racial.FOR);
    } else {
        pontos -= somaPontos(actorData.atributos.FOR - actorData.mod_racial.FOR);
        g_for = somaPontos(actorData.atributos.FOR - actorData.mod_racial.FOR);
    }

    if ((actorData.atributos.FIS > actorData.mod_racial.FIS) && (actorData.mod_racial.FIS > 0)) {
        pontos -= somaPontos(actorData.atributos.FIS) - somaPontos(actorData.mod_racial.FIS);
        g_fis = somaPontos(actorData.atributos.FIS) - somaPontos(actorData.mod_racial.FIS);
    } else if ((actorData.atributos.FIS > actorData.mod_racial.FIS) && (actorData.mod_racial.FIS < 0)) {
        pontos -= (somaPontos(actorData.atributos.FIS) - actorData.mod_racial.FIS);
        g_fis = (somaPontos(actorData.atributos.FIS) - actorData.mod_racial.FIS);
    } else {
        pontos -= somaPontos(actorData.atributos.FIS - actorData.mod_racial.FIS);
        g_fis = somaPontos(actorData.atributos.FIS - actorData.mod_racial.FIS);
    }

    if ((actorData.atributos.AGI > actorData.mod_racial.AGI) && (actorData.mod_racial.AGI > 0)) {
        pontos -= somaPontos(actorData.atributos.AGI) - somaPontos(actorData.mod_racial.AGI);
        g_agi = somaPontos(actorData.atributos.AGI) - somaPontos(actorData.mod_racial.AGI);
    } else if ((actorData.atributos.AGI > actorData.mod_racial.AGI) && (actorData.mod_racial.AGI < 0)) {
        pontos -= (somaPontos(actorData.atributos.AGI) - actorData.mod_racial.AGI);
        g_agi = (somaPontos(actorData.atributos.AGI) - actorData.mod_racial.AGI);
    } else {
        pontos -= somaPontos(actorData.atributos.AGI - actorData.mod_racial.AGI);
        g_agi = somaPontos(actorData.atributos.AGI - actorData.mod_racial.AGI);
    }

    if ((actorData.atributos.PER > actorData.mod_racial.PER) && (actorData.mod_racial.PER > 0)) {
        pontos -= somaPontos(actorData.atributos.PER) - somaPontos(actorData.mod_racial.PER);
        g_per = somaPontos(actorData.atributos.PER) - somaPontos(actorData.mod_racial.PER);
    } else if ((actorData.atributos.PER > actorData.mod_racial.PER) && (actorData.mod_racial.PER < 0)) {
        pontos -= (somaPontos(actorData.atributos.PER) - actorData.mod_racial.PER);
        g_per = (somaPontos(actorData.atributos.PER) - actorData.mod_racial.PER);
    } else {
        pontos -= somaPontos(actorData.atributos.PER - actorData.mod_racial.PER);
        g_per = somaPontos(actorData.atributos.PER - actorData.mod_racial.PER);
    }
    
    if (pontos != actorData.carac_final.INT) {
        updatePers['system.carac_final.INT'] = pontos;
        updatePers['system.carac_sort.INT'] = g_int;
        updatePers['system.carac_sort.AUR'] = g_aur;
        updatePers['system.carac_sort.CAR'] = g_car;
        updatePers['system.carac_sort.FOR'] = g_for;
        updatePers['system.carac_sort.FIS'] = g_fis;
        updatePers['system.carac_sort.AGI'] = g_agi;
        updatePers['system.carac_sort.PER'] = g_per;
    }
}
